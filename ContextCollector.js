/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");

	var ASTApi = require("./ASTApi");
	var IdentifierCollector = require("./IdentifierCollector");
	var IdentifierMapping = require("./IdentifierMapping");
	var SourceCode = require("./SourceCode");
	var Scope = require("./Scope");
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

	function ContextCollector(source) {
		this.source = new SourceCode(source);
		this.globalScope = scopeMappingForCode(source);
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

		var interestingLocations = [];	
		var interestingIdentifiers = [];
		
		var unknowns = topScope.getUnknownVariables().slice();
		var interestingUnknowns = unknowns;
		function locationsForLine(lineNo, context, scope, level) {
			var identifiers = context.getIdentifiersInLine(lineNo);

			identifiers.forEach(function(id) {
				var locations = scope.getLocationsForIdentifier(id);
				locations.forEach(function(loc) {

					var isFirstLine = loc.start.line === firstLine;
					var locAlreadyAdded = interestingLocations.some(function(l){
						return loc.start.line === l.start.line;
					});

					if (!isFirstLine && !locAlreadyAdded) {
						loc.level = level;
						
						var newScope = context.getScopeForLine(loc.start.line);
						var nextLevel = level;
						if (newScope !== scope) {
							var filteredInterestingUnknowns = newScope.getUnknownVariables().filter(function(u){
								return !newScope.params.some(function(p) {
									return p.name === u;
								});
							});
							
							interestingUnknowns = interestingUnknowns.concat(filteredInterestingUnknowns);
							nextLevel = level + 1;
							interestingLocations.push( {start: {line: newScope.range.start}, end: {line: newScope.range.end}});
						} else {
							interestingLocations.push(loc);	
						}

						if (loc.start.line <= firstLine) {
							locationsForLine(loc.start.line, context, newScope, nextLevel);
						}
					}
				});

				var idAlreadyAdded = interestingIdentifiers.indexOf(id) !== -1;
				if (!idAlreadyAdded) {
					interestingIdentifiers.push(id);
				}
			});
		}

		locationsForLine(firstLine, this, topScope, 0);

		var locationsWithoutDuplicates = interestingLocations.filter(function(loc) {
			var multiLine = loc.start.line !== loc.end.line;
			if(multiLine) return true;

			var multiLines = interestingLocations.filter(function(l){
				return l.start.line !== l.end.line;
			});

			var duplicate = multiLines.some(function(multi) {
				return multi.start.line <= loc.start.line && multi.end.line >+ loc.end.line;
			});

			return duplicate === false;
		});

		var locationsWithoutParams = locationsWithoutDuplicates.filter(function(loc) {
			return !topScope.params.some(function(p){
				return p.loc.start.line === loc.start.line;
			});
		});

		
		var locationsBeforeThisLine = locationsWithoutParams.filter(function(l) {
			return l.start.line < firstLine;
		}).sort(function(a,b) {
			return a.start.line - b.start.line;
		});

		var context = this;
		var contextIdentifiers = context.getIdentifiersInLine(firstLine);

		function addToContextIdentifiersIfNotAlreadyThere(id) { 
			if (contextIdentifiers.indexOf(id) === -1) {
				contextIdentifiers.push(id); 
			}
		}
		locationsBeforeThisLine.forEach(function(loc) {
			var currentLine;
			for(currentLine = loc.start.line; currentLine <= loc.end.line; currentLine++) {
				var identifiersInLine = context.getIdentifiersInLine(currentLine);
				identifiersInLine.forEach(addToContextIdentifiersIfNotAlreadyThere);
			}
		});

		var filteredUnknowns = interestingUnknowns.filter(function(unknown) {
			return contextIdentifiers.indexOf(unknown) !== -1;
		});

		var source = this.source;
		var theContextLines = locationsBeforeThisLine.map(function(loc) {

			if (loc.start.line === loc.end.line) {
				 return source.getLine(loc.start.line).trim();
			} else {
				var indentation = "";
				var level;
				for(level = 0; level < loc.level; level++) {
					indentation += "\t";
				}

				var current;
				var multiLines = [];

				var indentIfNotFirstOrLast = function (line, lineNo, firstLineNo, lastLineNo) {

					if (lineNo !== firstLineNo && lineNo !== lastLineNo) {
						line = "\t" + line;
					}

					return line;
				};

				for(current = loc.start.line; current <= loc.end.line; current++) {
					multiLines.push(indentIfNotFirstOrLast(source.getLine(current).trim(), current, loc.start.line, loc.end.line));
				}

				return multiLines.join("\n");
			}
		});

		var declarationsForUnknowns = this.createDeclarationsForUnknowns(filteredUnknowns, topScope, firstLine);

		return declarationsForUnknowns.concat(theContextLines).join("\n");
	};

	ContextCollector.prototype.createDeclarationsForUnknowns = function(identifiers, scope, line) {
		var declarations = [];
		identifiers.forEach(function(identifier) {
			var declaration = generateDeclarationWithTag(identifier, "<#undefined:" + identifier + ":" + line + "#>");
			declarations.push(declaration);
		});

		return declarations;
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

	function scopeMappingForCode(source) {
		var ast = esprima.parse(source, {loc: true});
		var scope = new Scope("__global");

		var RESERVED_IDENTIFIERS = ["console", "Object", "prototype", "toString", "hasOwnProperty", "replace", "String", "split", "Error", "JSON", "parse", "map", "splice", "length", "RegExp", "readFileSync", "Buffer"];

		var astVisitor = new ASTApi(ast, scope);
		astVisitor.setDebug(true);

		astVisitor.on("Program", function(program, scope, defaultBehaviour) {
			scope.range = {start: program.loc.start.line, end: program.loc.end.line};
			defaultBehaviour();
		});

		function traceFunctionWithNewScope(fn, scope, defaultBehaviour) {
			var functionName;
			if (fn.id !== undefined && fn.id !== null) {
				 functionName = fn.id.name;
			} else {
				functionName = "anonymous:" + fn.loc.start.line;
			}
			

			var identifiers = scope.locationsIndexedByIdentifiers;

			if (identifiers[functionName] === undefined) {
					identifiers[functionName] = [];	
			}
			
			identifiers[functionName].push(fn.loc);	

			var functionScope = new Scope(functionName);
			functionScope.range = {start: fn.loc.start.line, end: fn.loc.end.line};

			if (fn.type === "FunctionDeclaration") {
				scope.getLocals().push(functionName);
			} else {
				functionScope.getLocals().push(functionName);
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
				return {
					name: p.name,
					loc: p.loc
				};
			});

			defaultBehaviour();
		});

		astVisitor.on("Property", function() {});

		astVisitor.trace();

		return scope;
	}

	exports.ContextCollector = ContextCollector;
	exports.getIdentifierMapping = getIdentifierMapping;
	exports.scopeMappingForCode = scopeMappingForCode;

})();