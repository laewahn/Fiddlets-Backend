/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");

	var ASTApi = require("./ASTApi");
	var Context = require("./Context");
	var IdentifierCollector = require("./IdentifierCollector");
	var IdentifierMapping = require("./IdentifierMapping");
	
	var debug = false;

	exports.setDebug = function(debugFlag) {
		debug = debugFlag;
	};

	Array.prototype.remove = function(element) {
		var elementIdx = this.indexOf(element);
		if (elementIdx !== -1) {
			this.splice(elementIdx, 1);
		}
	};

















	exports.scopeMappingForCode = function(source) {
		var ast = esprima.parse(source, {loc: true});
		var scope = new Scope();

		var RESERVED_IDENTIFIERS = ["console"];

		var astVisitor = new ASTApi(ast, scope);
		astVisitor.setDebug(true);

		astVisitor.on("Program", function(program, scope, defaultBehaviour) {
			scope.range = {start: program.loc.start.line, end: program.loc.end.line};
			defaultBehaviour();
		});

		function traceWithNewScope(fn, scope, defaultBehaviour) {

			var functionScope = new Scope();
			functionScope.range = {start: fn.loc.start.line, end: fn.loc.end.line};

			if (fn.type === "FunctionDeclaration") {
				scope.getLocals().push(fn.id.name);
			} else {
				functionScope.getLocals().push(fn.id.name);
			}

			functionScope.parent = scope;

			astVisitor.collector = functionScope;
			defaultBehaviour();			
			astVisitor.collector = scope;

			scope.containedScopes.push(functionScope);
		}

		astVisitor.on("FunctionDeclaration", traceWithNewScope);
		astVisitor.on("FunctionExpression", traceWithNewScope);

		astVisitor.on("Function::Params", function(params, scope, defaultBehaviour) {
			params.forEach(function(param) {
				scope.getUnknownVariables().push(param.name);	
			});
		});

		astVisitor.on("VariableDeclarator", function(declarator, scope, defaultBehaviour) {
			scope.getLocals().push(declarator.id.name);
			defaultBehaviour();
		});

		astVisitor.on("Identifier", function(identifier, scope, defaultBehaviour) {
			var identifiers = scope.getIdentifiers();
			var identifierName = identifier.name;

			if (identifiers.indexOf(identifierName) === -1 && RESERVED_IDENTIFIERS.indexOf(identifierName) === -1) {
				identifiers.push(identifier.name);
			}
		});

		astVisitor.trace();

		return scope;
	};
	
	function Scope() {
		this.locals = [];
		this.containedScopes = [];
		this.unknownVariables = [];
		this.identifiers = [];
	}

	Scope.prototype.range = undefined;
	Scope.prototype.getRange = function() {
		return this.range;
	};

	Scope.prototype.locals = undefined;
	Scope.prototype.getLocals = function() {
		return this.locals;
	};

	Scope.prototype.containedScopes = undefined;
	Scope.prototype.getContainedScopes = function() {
		return this.containedScopes;
	};
	Scope.prototype.getContainedScope = function(scopeIdx) {
		return this.getContainedScopes()[scopeIdx];
	};

	Scope.prototype.parent = undefined;
	Scope.prototype.getParent = function() {
		return this.parent;
	};

	Scope.prototype.unknownVariables = undefined;
	Scope.prototype.getUnknownVariables = function() {
		return this.unknownVariables;
	};

	Scope.prototype.identifiers = undefined;
	Scope.prototype.getIdentifiers = function() {
		return this.identifiers;
	};
































	exports.contextForLineInSource = function(lineNr, source) {
		var sourceWrapper = new SourceCode(source);
		var identifierMapping = getIdentifierMapping(source);

		var context = new Context();
		var identifiers = sourceWrapper.identifiersInLine(lineNr);

		identifiers.forEach(function(identifier){
			var locs = identifierMapping.locationsFor(identifier);
			locs.forEach(function(otherLineLocation) {
				
				if (otherLineLocation.start.line < lineNr) {
					var theLine = sourceWrapper.getLine(otherLineLocation.start.line);
					var identifiersInOtherLine = sourceWrapper.identifiersInLine(otherLineLocation.start.line);
					identifiersInOtherLine.remove(identifier);

					if (identifiersInOtherLine.length !== 0) {
						var foo = identifierMapping.variablesDeclaredInLocation(otherLineLocation);
						if (otherLineLocation.start.line === otherLineLocation.end.line) {
							if (foo !== undefined) {
								foo.forEach(function(declaredVariable) {
									var generatedDeclaration = generateDeclarationWithTag(declaredVariable, "<#undefined#>");
									context.addLineWithSourceAndLocation(generatedDeclaration, otherLineLocation);
								});
	
								console.log(JSON.stringify(identifiersInOtherLine));		
							} else {
								console.log("!!!!!!!!!!!!!!!!!!!");
								console.log(identifier);
								console.log(locs.map(function(l) {return JSON.stringify(l);}).join("\n"));
								console.log("otherLineLocation", JSON.stringify(otherLineLocation));
							}	
						}						
					} 
					
					if (identifiersInOtherLine.length === 0 && !context.hasLine(theLine)) {
						context.removeUnknownVariable(identifier);
						context.addLineWithSourceAndLocation(theLine, otherLineLocation);
					}
				}
			});
		}, this);

		return context;
	};

	function generateDeclarationWithTag(variable, tag) {
		var declarationAST = {
            						"type": "VariableDeclaration",
           							"declarations": [
             						   {
                    						"type": "VariableDeclarator",
                    						"id": {
                        						"type": "Identifier",
                        						"name": variable
                    						},
                    						"init": {
                        						"type": "Identifier",
                        						"name": tag
                    						}
                						}
            						],
           							"kind": "var"
        						};
       	var escodegen = require("escodegen");
        return escodegen.generate(declarationAST);
	}

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

		identifierMapping.on("VariableDeclarator", function(declarator, mapping, defaultBehaviour) {
			mapping.setDeclarationForLine(declarator.id.name, declarator.loc.start.line);
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

	

	

})();