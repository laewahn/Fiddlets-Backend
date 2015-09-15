/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var ASTApi = require("./ASTApi");

	var debug = false;

	exports.setDebug = function(debugFlag) {
		debug = debugFlag;
	};

	exports.contextForLineInSource = function(lineNr, source) {
		var sourceWrapper = new SourceCode(source);
		
		var contextLines = [];
		var unknownVariables = {};
		var linesWithKnownVariables = [];

		var identifierMapping = getIdentifierMapping(source);
		sourceWrapper.identifiersInLine(lineNr).forEach(function(identifier){
			var lines = identifierMapping.linesFor(identifier);
			lines.forEach(function(lineLocation) {
				
				if (lineLocation.start.line < lineNr) {
					var theLine = sourceWrapper.getLine(lineLocation.start.line);
					var theLineIdentifiers = sourceWrapper.identifiersInLine(lineLocation.start.line);
					var identifierIdx = theLineIdentifiers.indexOf(identifier);
					if (identifierIdx !== -1) {
						theLineIdentifiers.splice(identifierIdx, 1);
					}

					if (theLineIdentifiers.length !== 0 && unknownVariables[identifier] === undefined ) {
						unknownVariables[identifier] = lineLocation;

						var declarations = identifierMapping.declarationsForLine(lineLocation.start.line);
						declarations.forEach(function(declaration) {
							if (unknownVariables[declaration] !== undefined) {
								var declarationAST = {
            						"type": "VariableDeclaration",
           							"declarations": [
             						   {
                    						"type": "VariableDeclarator",
                    						"id": {
                        						"type": "Identifier",
                        						"name": declaration
                    						},
                    						"init": {
                        						"type": "Identifier",
                        						"name": "<#undefined#>"
                    						}
                						}
            						],
           							"kind": "var"
        						};
        						var escodegen = require("escodegen");
        						var declarationLine = escodegen.generate(declarationAST);
        						linesWithKnownVariables.push(new Line(declarationLine, lineLocation));
        						console.log(declarationLine);
							}
						});
					} 
					
					if (theLineIdentifiers.length === 0 && linesWithKnownVariables.some(function(line) {return line.source === theLine;}) === false) {
						if (unknownVariables[identifier] !== undefined) {
							unknownVariables[identifier] = undefined;
						}
						linesWithKnownVariables.push(new Line(theLine, lineLocation));
					}
				}
			});

			contextLines = contextLines.concat(identifierMapping.linesFor(identifier));
		}, this);

		return {
			"lines" : contextLines,
			"stringRepresentation" :function() {
				// console.log("Unknown: " + JSON.stringify(unknownVariables, null, 2));
				// console.log("Lines: " + JSON.stringify(linesWithKnownVariables, null, 2));

				return linesWithKnownVariables.sort(function(a, b) {return a.startsBefore(b);}).map(function(e) {return e.source;}).join("\n");
			}
		};
	};

	function Line(source, location) {
		this.source = source;
		this.location = location;
	}

	Line.prototype.source = undefined;
	Line.prototype.location = undefined;

	Line.prototype.startsBefore = function(other) {
		return this.location.start.line - other.location.start.line;
	};

	function SourceCode(source) {
		this.source = source;
		this.lines = this.source.split("\n");
	}

	SourceCode.prototype.source = undefined;
	SourceCode.prototype.lines = undefined;

	SourceCode.prototype.getLine = function(lineNr) {
		return this.lines[lineNr - 1];
	};

	SourceCode.prototype.identifiersInLine = function(lineNr) {
		var identifierMapping = getIdentifierMapping(this.source);
		return identifierMapping.identifiersForLine(lineNr);
	};

	exports.SourceCode = SourceCode;
	exports.getIdentifierMapping = getIdentifierMapping;

	function getIdentifierMapping(source) {
		var ast = esprima.parse(source, {loc: true});

		var identifierMapping = new ASTApi(ast, new IdentifierMapping());
		identifierMapping.setDebug(debug);

		identifierMapping.on("VariableDeclaration", function(line, mapping, defaultBehaviour) {
			line.declarations.forEach(function(declaration) {
				mapping.setDeclarationForLine(declaration.id.name, declaration.loc.start.line);
				mapping.setIdentifierForLine(declaration.id.name, declaration.loc.start.line);
				mapping.setLocationForVariableName(declaration.id.name, declaration.loc);
			});
			
			defaultBehaviour();
		});
		
		identifierMapping.on("Identifier", function(identifier, mapping, defaultBehaviour) {
			defaultBehaviour();

			mapping.setLocationForVariableName(identifier.name, identifier.loc);
			mapping.setIdentifierForLine(identifier.name, identifier.loc.start.line);
		});

		identifierMapping.on("FunctionDeclaration", function(functionExpression, mapping, defaultBehaviour) {
			mapping.setLocationForVariableName(functionExpression.id.name, functionExpression.loc);
			collectIdentifiersForASTMembers(["body"])(functionExpression, mapping, defaultBehaviour);

			defaultBehaviour();
		});

		identifierMapping.on("FunctionExpression", collectIdentifiersForASTMembers(["body"]));

		function collectIdentifiersForASTMembers(astMembers) {
			return function(ifStatement, mapping, defaultBehaviour) {
				var identifierCollector = new IdentifierCollector(ifStatement);
				var identifiers = identifierCollector.traceFor(astMembers);
				
				identifiers.forEach(function(identifier) {
					mapping.setLocationForVariableName(identifier, ifStatement.loc);
				});

				defaultBehaviour();
			};
		}

		identifierMapping.on("IfStatement", collectIdentifiersForASTMembers(["consequent", "alternate"]));
		identifierMapping.on("ForStatement", collectIdentifiersForASTMembers(["init", "test", "update", "body"]));

		return identifierMapping.trace();
	}

	function IdentifierCollector(ast) {
		this.identifiers = [];
		this.ast = ast;

		this.astAPI = new ASTApi(ast, this.identifiers);

		this.astAPI.on("Identifier", function(anIdentifier, identifiers, defaultBehaviour) {
			if (identifiers.indexOf(anIdentifier.name !== -1)) {
				identifiers.push(anIdentifier.name);
			}

			defaultBehaviour();
		});
	}

	IdentifierCollector.prototype.trace = function() {
		return this.astAPI.trace();
	};

	IdentifierCollector.prototype.traceFor = function(members) {
		members.forEach(function(member){
			this.astAPI.ast = this.ast[member];
			this.astAPI.trace();
		}, this);

		return this.identifiers;
	};

	IdentifierCollector.prototype.constructor = IdentifierCollector;
	IdentifierCollector.prototype.astAPI = undefined;
	IdentifierCollector.prototype.identifiers = undefined;

	function IdentifierMapping() {
		this.locationsByIdentifier = {};
		this.identifiersByLocation = {};
		this.declarationsByLocation = {};
	}

	IdentifierMapping.prototype.constructor = IdentifierMapping;
	IdentifierMapping.prototype.locationsByIdentifier = undefined;
	IdentifierMapping.prototype.identifiersByLocation = undefined;
	IdentifierMapping.prototype.declarationsByLocation = undefined;

	IdentifierMapping.prototype.linesFor = function(variableName) {
		return this.locationsByIdentifier[variableName];
	};

	IdentifierMapping.prototype.setLocationForVariableName = function(variableName, location) {
		if (this.locationsByIdentifier[variableName] === undefined) {
			this.locationsByIdentifier[variableName] = [];
		}

		this.locationsByIdentifier[variableName].push(location);
	};

	IdentifierMapping.prototype.identifiersForLine = function(lineNr) {
		return this.identifiersByLocation[lineNr];
	};

	IdentifierMapping.prototype.setIdentifierForLine = function(variableName, lineNr) {
		if (this.identifiersByLocation[lineNr] === undefined) {
			this.identifiersByLocation[lineNr] = [];
		}

		this.identifiersByLocation[lineNr].push(variableName);
	};

	IdentifierMapping.prototype.declarationsForLine = function(lineNr) {
		return this.declarationsByLocation[lineNr];
	};

	IdentifierMapping.prototype.setDeclarationForLine = function(declaration, lineNr) {
		if (this.declarationsByLocation[lineNr] === undefined) {
			this.declarationsByLocation[lineNr] = [];
		}

		this.declarationsByLocation[lineNr].push(declaration);
	};

})();