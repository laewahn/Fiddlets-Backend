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
		var allLines = source.split("\n")
		var currentLine = allLines[lineNr - 1];

		var currentLineIdentifierCollector = new IdentifierCollector(esprima.parse(currentLine));
		var currentLineIdentifiers = currentLineIdentifierCollector.trace();
		
		var identifierMapping = exports.getIdentifierMapping(source);
		
		var contextLines = [];
		var unknownVariables = {};
		var linesWithKnownVariables = [];

		currentLineIdentifiers.forEach(function(identifier){
			var linesWithIdentifier = identifierMapping.linesFor(identifier);
			linesWithIdentifier.forEach(function(lineLocation) {
				
				if (lineLocation.start.line < lineNr) {
					var theLine = allLines[lineLocation.start.line - 1];
					var theLineIdentifiersCollector = new IdentifierCollector(esprima.parse(theLine));
					var theLineIdentifiers = theLineIdentifiersCollector.trace();
					
					if (theLineIdentifiers.length !== 0 && unknownVariables[identifier] === undefined) {
						unknownVariables[identifier] = lineLocation;
					} 
					
					if (theLineIdentifiers.length === 0 && linesWithKnownVariables.indexOf(lineLocation) === -1) {
						linesWithKnownVariables.push(theLine);
					}
				}
			});

			contextLines = contextLines.concat(identifierMapping.linesFor(identifier));
		}, this);

		return {
			"lines" : contextLines,
			"stringRepresentation" :function() {
				console.log("Unknown: " + JSON.stringify(unknownVariables, null, 2));
				console.log("Lines: " + JSON.stringify(linesWithKnownVariables, null, 2));

				return "";
			}
		};
	};

	exports.getIdentifierMapping = function(source) {
		var ast = esprima.parse(source, {loc: true});

		var identifierMapping = new ASTApi(ast, new IdentifierMapping());
		identifierMapping.setDebug(debug);

		identifierMapping.on("VariableDeclaration", function(line, mapping, defaultBehaviour) {
			line.declarations.forEach(function(declaration) {
				mapping.setLocationForVariableName(declaration.id.name, declaration.loc);
			});
			
			defaultBehaviour();
		});
		
		identifierMapping.on("Identifier", function(identifier, mapping, defaultBehaviour) {
			mapping.setLocationForVariableName(identifier.name, identifier.loc);
			defaultBehaviour();
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
	};

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
		this.contextMapping = {};
	}

	IdentifierMapping.prototype.constructor = IdentifierMapping;
	IdentifierMapping.prototype.contextMapping = undefined;

	IdentifierMapping.prototype.linesFor = function(variableName) {
		return this.contextMapping[variableName];
	};

	IdentifierMapping.prototype.setLocationForVariableName = function(variableName, location) {
		if (this.contextMapping[variableName] === undefined) {
			this.contextMapping[variableName] = [];
		}

		this.contextMapping[variableName].push(location);
	};

})();