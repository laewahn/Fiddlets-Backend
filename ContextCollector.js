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

		astVisitor.on("Property", function(prop) {
			// console.log("Ignoring ", prop.key.name);
		});

		astVisitor.trace();

		return scope;
	};
	
	function Scope(name) {
		this.locals = [];
		this.containedScopes = [];
		this.unknownVariables = [];
		this.locationsIndexedByIdentifiers = {};
		this.params = [];
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

		var interestingLocations = [];	
		var interestingIdentifiers = [];
		
		var unknowns = topScope.getUnknownVariables().slice();
		var interestingUnknowns = unknowns;
		function locationsForLine(lineNo, context, scope, level) {
			var identifiers = context.getIdentifiersInLine(lineNo);

			// console.log("identifiers in line " + lineNo + ": " + JSON.stringify(identifiers));

			identifiers.forEach(function(id) {
				var locations = scope.getLocationsForIdentifier(id);
				locations.forEach(function(loc) {
					if (loc.end.line === undefined) {
						// console.log("Undefined end for ", id);
					}

					var isFirstLine = loc.start.line === firstLine;
					var locAlreadyAdded = interestingLocations.some(function(l){
						return loc.start.line === l.start.line;
					});

					if (!isFirstLine && !locAlreadyAdded) {
						loc.level = level;
						
						var newScope = context.getScopeForLine(loc.start.line);
						var nextLevel = level;
						if (newScope !== scope) {
							// console.log(newScope.params);
							var filteredInterestingUnknowns = newScope.getUnknownVariables().filter(function(u){
								// console.log("filter? ", u);
								return !newScope.params.some(function(p) {
									return p.name === u;
								});
							});
							
							interestingUnknowns = interestingUnknowns.concat(filteredInterestingUnknowns);
							nextLevel = level + 1;
							// console.log("New scope unknowns: ", filteredInterestingUnknowns);
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
		// console.log("interestingLocations: ", interestingLocations.map(function(l) {return "" + l.start.line + " - " + l.end.line;}));

		var locationsWithoutDuplicates = interestingLocations.filter(function(loc) {
			var multiLine = loc.start.line !== loc.end.line;
			if(multiLine) return true;

			var multiLines = interestingLocations.filter(function(l){
				return l.start.line !== l.end.line;
			});

			var duplicate = multiLines.some(function(multi) {
				return multi.start.line <= loc.start.line && multi.end.line >+ loc.end.line;
			});

			// console.log(loc, " is duplicate: " + duplicate);

			return duplicate === false;
		});

		var locationsWithoutParams = locationsWithoutDuplicates.filter(function(loc) {
			if (topScope.params === undefined) {
				// console.log(topScope);
			}
			return !topScope.params.some(function(p){
				return p.loc.start.line === loc.start.line;
			});
		});

		
		var locationsBeforeThisLine = locationsWithoutParams.filter(function(l) {
			return l.start.line < firstLine;
		}).sort(function(a,b) {
			return a.start.line - b.start.line;
		});


		// console.log("locationsBeforeThisLine: ", locationsBeforeThisLine.map(function(l) {return l.start.line;}));
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

		// console.log("contextIdentifiers: ", contextIdentifiers);
		// console.log("unknowns: ", unknowns);
		// console.log("interestingUnknowns: ", interestingUnknowns);
		// console.log("filteredUnknowns: ", filteredUnknowns);

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
				for(current = loc.start.line; current <= loc.end.line; current++) {
					multiLines.push(indentIfNotFirstOrLast(source.getLine(current).trim(), current, loc.start.line, loc.end.line));
				}
				return multiLines.join("\n");
			}
		});

		// console.log(theContextLines.join("\n"));

		

		
		var lineLocations = [];

		// var unknowns = topScope.getUnknownVariables().slice();
		// console.log(topScope);
		// unknowns = [];

		// function getLineLocationsForLine(context, line, scope) {

		// 	var lineInfo = {};
		// 	var identifiers = context.getIdentifiersInLine(line);

		// 	lineInfo.identifiers = identifiers;
		// 	lineInfo.line = line;
		// 	// console.log("Identifiers: ", identifiers);
		// 	identifiers.forEach(function(identifier){
		// 		if (scope.getLocationsForIdentifier(identifier) === undefined) {
		// 			return;
		// 		}
		// 		// console.log(identifier);

		// 		scope.getLocationsForIdentifier(identifier).forEach(function(location) {
					
		// 			var lineScope = context.getScopeForLine(location.start.line);
		// 			if (lineScope !== scope) {
		// 				var newScopeUnknowns = lineScope.getUnknownVariables();
		// 				newScopeUnknowns.forEach(function(id) {
		// 					if (lineScope.params.map(function(p) {return p.name;}).indexOf(id) === -1) {
		// 						unknowns.push(id);
		// 						scope.getUnknownVariables().push(id);
		// 					}
		// 				});
		// 			}
					
		// 			var locationAlreadyAdded = lineLocations.some(function(loc) {
		// 				return loc.start.line === location.start.line;
		// 			});
		// 			if (identifier === "entityMap") {
		// 				// console.log("Found entityMap");
		// 				// console.log(location);
		// 				// console.log("Already added? " + locationAlreadyAdded);
		// 			}
					
	
		// 			var scopeRange = scope.getRange();
		// 			var inScope = (scopeRange.start <= location.start.line && location.start.line <= scopeRange.end);
		// 			// console.log("In scope: ", inScope);
		// 			var inScopeButAfterFirstLine = inScope && 
		// 											 (location.start.line >= firstLine);
	
		// 			var unknown = unknowns.indexOf(identifier) !== -1;
		// 			// console.log("unknowns: ", unknowns);
		// 			// console.log("Params: " + scope.params);

		// 			var isParam = scope.params.map(function(p) {return p.name;}).indexOf(identifier) !== -1;
		// 			if (isParam && !unknown) {
		// 				unknowns.push(identifier);
		// 			}

		// 			if (unknown || inScopeButAfterFirstLine || isParam) {
		// 				return;
		// 			}
					
		// 			var inCurrentLine = location.start.line === line;
		// 			if (!(locationAlreadyAdded || inCurrentLine) || !inScope) {
		// 				lineLocations.push(location);
		// 				getLineLocationsForLine(context, location.start.line, scope);
		// 			}
		// 		});
		// 	});
		// }

		// getLineLocationsForLine(this, firstLine, topScope);
		// console.log("unknowns: ", unknowns);
		// var declarationsForUnknowns = this.createDeclarationsForUnknowns(unknowns, topScope, firstLine);
		var declarationsForUnknowns = this.createDeclarationsForUnknowns(filteredUnknowns, topScope, firstLine);
		// console.log("declarations for unknowns ", declarationsForUnknowns);

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

		return declarationsForUnknowns.concat(theContextLines).join("\n");
	};

	ContextCollector.prototype.createDeclarationsForUnknowns = function(identifiers, scope, line) {
		var declarations = [];
		identifiers.forEach(function(identifier) {
			// console.log("Creating declaration for " + identifier);
			// if (scope.getUnknownVariables().indexOf(identifier) !== -1) {
				var declaration = generateDeclarationWithTag(identifier, "<#undefined:" + identifier + ":" + line + "#>");
				declarations.push(declaration);
			// }
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