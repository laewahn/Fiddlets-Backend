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

		var RESERVED_IDENTIFIERS = ["console", "Object", "prototype", "toString", "hasOwnProperty", "replace", "String"];

		var astVisitor = new ASTApi(ast, scope);
		// astVisitor.setDebug(true);

		astVisitor.on("Program", function(program, scope, defaultBehaviour) {
			scope.range = {start: program.loc.start.line, end: program.loc.end.line};
			defaultBehaviour();
		});

		function traceFunctionWithNewScope(fn, scope, defaultBehaviour) {
			var functionName = fn.id.name;

			var identifiers = scope.locationsIndexedByIdentifiers;

			if (identifiers[functionName] === undefined) {
					identifiers[functionName] = [];	
			}
			
			identifiers[functionName].push(fn.loc);	

			var functionScope = new Scope(fn.id.name);
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

		astVisitor.on("FunctionDeclaration", traceFunctionWithNewScope);
		astVisitor.on("FunctionExpression", traceFunctionWithNewScope);

		astVisitor.on("VariableDeclarator", function(declarator, scope, defaultBehaviour) {
			scope.getLocals().push(declarator.id.name);
			defaultBehaviour();
		});

		astVisitor.on("Identifier", function(identifier, scope) {
			var identifiers = scope.locationsIndexedByIdentifiers;
			var identifierName = identifier.name;

			if (RESERVED_IDENTIFIERS.indexOf(identifierName) === -1) {			
				// Assumption: if someone declares a variable after using it, he deserves unexpected behaviour...
				if (scope.getLocals().indexOf(identifierName) === -1 &&
					scope.getUnknownVariables().indexOf(identifierName) === -1) {
					scope.getUnknownVariables().push(identifierName);
				}
				
				if (identifiers[identifierName] === undefined) {	
					identifiers[identifierName] = [];	
				}
				
				identifiers[identifierName].push(identifier.loc);	
			}
		});

		astVisitor.on("Function::Params", function(params, scope, defaultBehaviour) {
			scope.params = params.map(function(p) {
				return p.name;
			});

			defaultBehaviour();
		});

		astVisitor.trace();

		return scope;
	};
	
	function Scope(name) {
		this.locals = [];
		this.containedScopes = [];
		this.unknownVariables = [];
		this.locationsIndexedByIdentifiers = {};
		this.name = name;
	}

	Scope.prototype.name = undefined;
	Scope.prototype.getName = function() {
		return this.name || "global";
	};

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

	Scope.prototype.getScopeForLine = function(line) {

		var returnScope = this;

		var hasChildScope = this.hasChildScopeInLine(line);
		if (hasChildScope) {
			returnScope = this.childScopeInLine(line).getScopeForLine(line);
		}
		
		return returnScope;
	};

	Scope.prototype.hasChildScopeInLine = function(line) {
		return this.getContainedScopes().some(function(nextScope){
			var range = nextScope.getRange();
			return (range.start <= line && line <= range.end);
		});
	};

	Scope.prototype.childScopeInLine = function(line) {
		var childScope;
		var foundChildScope = this.getContainedScopes().some(function(nextScope) {
			var range = nextScope.getRange();
			var found = (range.start <= line && line <= range.end);
			
			if(found) {
				childScope = nextScope;
			}

			return found;
		});

		return foundChildScope ? childScope : null;
	};

	Scope.prototype.whoKnows = function(identifier) {
		if (this.getUnknownVariables().indexOf(identifier) !== -1) {
			return null;
		}

		if (this.getIdentifiers().indexOf(identifier) !== -1) {
			return this;
		}

		if (this.getParent() === undefined) {
			return null;
		}

		return this.getParent().whoKnows(identifier);
	};

	Scope.prototype.parent = undefined;
	Scope.prototype.getParent = function() {
		return this.parent;
	};

	Scope.prototype.unknownVariables = undefined;
	Scope.prototype.getUnknownVariables = function() {
		return this.unknownVariables;
	};

	Scope.prototype.locationsIndexedByIdentifiers = undefined;
	Scope.prototype.getLocationsIndexedByIdentifiers = function() {
		return this.locationsIndexedByIdentifiers;
	};
	Scope.prototype.getLocationsForIdentifier = function(identifier) {
		return this.getLocationsIndexedByIdentifiers()[identifier];
	};
	Scope.prototype.getIdentifiers = function() {
		return Object.keys(this.locationsIndexedByIdentifiers);
	};

	function ContextCollector(source) {
		this.source = new SourceCode(source);
		this.globalScope = exports.scopeMappingForCode(source);
	}

	ContextCollector.prototype.source = undefined;

	ContextCollector.prototype.globalScope = undefined;
	ContextCollector.prototype.getScopeForLine = function(line) {
		return this.globalScope.getScopeForLine(line);
	};

	ContextCollector.prototype.getIdentifiersInLine = function(line) {
		var scope = this.getScopeForLine(line);
		
		var identifiersFilteredByLine = scope.getIdentifiers().filter(function(identifier) {
			return scope.getLocationsForIdentifier(identifier).some(function(location) {
				return (location.start.line <= line && line <= location.end.line);
			});
		});

		return identifiersFilteredByLine;
	};

	ContextCollector.prototype.contextForLine = function(firstLine) {
		var topScope = this.getScopeForLine(firstLine);

		var source = this.source;
		var lineLocations = [];

		var unknowns = topScope.getUnknownVariables().slice();
		
		function getLineLocationsForLine(context, line, scope) {
			var lineInfo = {};
			var identifiers = context.getIdentifiersInLine(line);
			
			lineInfo.identifiers = identifiers;
			lineInfo.line = line;

			identifiers.forEach(function(identifier){
				if (scope.getLocationsForIdentifier(identifier) === undefined) {
					return;
				}

				scope.getLocationsForIdentifier(identifier).forEach(function(location) {

					var lineScope = context.getScopeForLine(location.start.line);
					if (lineScope !== scope) {
						var newScopeUnknowns = lineScope.getUnknownVariables();
						newScopeUnknowns.forEach(function(id) {
							if (lineScope.params.indexOf(id) === -1) {
								unknowns.push(id);
								scope.getUnknownVariables().push(id);
							}
						});
					}
					
					var locationAlreadyAdded = lineLocations.some(function(loc) {
						return loc.start.line === location.start.line;
					});
	
					var scopeRange = scope.getRange();
					var inScope = (scopeRange.start <= location.start.line && location.start.line <= scopeRange.end);
					var inScopeButAfterFirstLine = inScope && 
													 (location.start.line >= firstLine);
	
					var unknown = unknowns.indexOf(identifier) !== -1;

					if (unknown || inScopeButAfterFirstLine) {
						return;
					}
					
					var inCurrentLine = location.start.line === line;
					if (!(locationAlreadyAdded || inCurrentLine) || !inScope) {
						lineLocations.push(location);
						getLineLocationsForLine(context, location.start.line, scope);
					}
				});
			});
		}

		getLineLocationsForLine(this, firstLine, topScope);
		
		var declarationsForUnknowns = this.createDeclarationsForUnknowns(unknowns, topScope, firstLine);

		function indentIfNotFirstOrLast(line, lineNo, firstLineNo, lastLineNo) {
			if (lineNo !== firstLineNo && lineNo !== lastLineNo) {
				return "\t" + line;
			}
			return line;
		}

		var contextLines = lineLocations.map(function(loc) {
			if (loc.start.line === loc.end.line) {
				return source.getLine(loc.start.line).trim();
			} else {
				var current;
				var multiLines = [];
				for(current = loc.start.line; current <= loc.end.line; current++) {
					multiLines.push(indentIfNotFirstOrLast(source.getLine(current).trim(), current, loc.start.line, loc.end.line));
				}
				return multiLines.join("\n");
			}
			
		});

		return declarationsForUnknowns.concat(contextLines).join("\n");
	};

	ContextCollector.prototype.createDeclarationsForUnknowns = function(identifiers, scope, line) {
		var declarations = [];
		identifiers.forEach(function(identifier) {
			if (scope.getUnknownVariables().indexOf(identifier) !== -1) {
				var declaration = generateDeclarationWithTag(identifier, "<#undefined:" + identifier + ":" + line + "#>");
				declarations.push(declaration);
			}
		});

		return declarations;
	};

	exports.ContextCollector = ContextCollector;























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