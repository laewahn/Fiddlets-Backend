/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var debug = false;

	exports.setDebug = function(debugFlag) {
		debug = debugFlag;
	};

	exports.getContextFor = function(source) {
		var ast = esprima.parse(source, {loc: true});

		var contextCollector = new ASTApi(ast, new Context());
		return contextCollector.trace();
	};

	function ASTApi(ast, collector) {
		this.ast = ast;
		this.collector = collector;
	}

	ASTApi.prototype.ast = undefined;
	ASTApi.prototype.collector = undefined;

	ASTApi.prototype.trace = function() {
		this._traceBody(this.ast.body, this.collector);
		return this.collector;
	}

	ASTApi.prototype._traceBody = function(body, collector) {
		body.forEach(function(line) {
			// console.log(JSON.stringify(line, null, 2));
			switch(line.type) {
				case "VariableDeclaration" :
					line.declarations.forEach(function(declaration) {
						collector.setLocationForVariableName(declaration.id.name, declaration.loc);

						if (declaration.init !== null) {
							evaluateExpressionStatement(declaration.init, collector);
						}
					});
					break;
				case "FunctionDeclaration" :					
					collector.setLocationForVariableName(line.id.name, line.loc);
					break;
				case "ExpressionStatement" :
					evaluateExpressionStatement(line.expression, collector);
					break;
				case "IfStatement" :
					evaluateExpressionStatement(line.test, collector);
					break;
				default:
					if (debug) {
						console.error("Token not supported: " + line.type);	
					}
			}
		});
	};

	ASTApi.prototype._evaluateExpressionStatement = function(expression, collector) {
		if (collector === null) {
			throw "!!!You forgot to pass over the collector!!!";
		}

		switch(expression.type) {
			case "AssignmentExpression" :
				evaluateExpressionStatement(expression.left, collector);
				evaluateExpressionStatement(expression.right, collector);
				break;
			case "CallExpression" :
				expression.arguments.forEach(function(argument) {
					evaluateExpressionStatement(argument, collector);
				});

				evaluateExpressionStatement(expression.callee, collector);
				break;
			case "MemberExpression" :
				evaluateExpressionStatement(expression.object, collector);
				break;
			case "FunctionExpression" :
				expression.params.forEach(function(param) {
					evaluateExpressionStatement(param, collector);
				});
				break;
			case "BinaryExpression" :
				evaluateExpressionStatement(expression.right, collector);
				evaluateExpressionStatement(expression.left, collector);
				break;
			case "ConditionalExpression" :
				evaluateExpressionStatement(expression.test, collector);
				evaluateExpressionStatement(expression.consequent, collector);
				evaluateExpressionStatement(expression.alternate, collector);
				break;
			case "Identifier" :
				collector.setLocationForVariableName(expression.name, expression.loc);
				break;
			default:
				if (debug) {
					console.log("No handling of " + expression.type);	
				}
		}
	};

	function traceBody(body, context) {
		body.forEach(function(line) {
			// console.log(JSON.stringify(line, null, 2));
			switch(line.type) {
				case "VariableDeclaration" :
					line.declarations.forEach(function(declaration) {
						context.setLocationForVariableName(declaration.id.name, declaration.loc);

						if (declaration.init !== null) {
							evaluateExpressionStatement(declaration.init, context);
						}
					});
					break;
				case "FunctionDeclaration" :					
					context.setLocationForVariableName(line.id.name, line.loc);
					break;
				case "ExpressionStatement" :
					evaluateExpressionStatement(line.expression, context);
					break;
				case "IfStatement" :
					evaluateExpressionStatement(line.test, context);
					break;
				default:
					if (debug) {
						console.error("Token not supported: " + line.type);	
					}
			}
		});
	}

	function evaluateExpressionStatement(expression, context) {
		if (context === null) {
			throw "!!!You forgot to pass over the context!!!";
		}

		switch(expression.type) {
			case "AssignmentExpression" :
				evaluateExpressionStatement(expression.left, context);
				evaluateExpressionStatement(expression.right, context);
				break;
			case "CallExpression" :
				expression.arguments.forEach(function(argument) {
					evaluateExpressionStatement(argument, context);
				});

				evaluateExpressionStatement(expression.callee, context);
				break;
			case "MemberExpression" :
				evaluateExpressionStatement(expression.object, context);
				break;
			case "FunctionExpression" :
				expression.params.forEach(function(param) {
					evaluateExpressionStatement(param, context);
				});
				break;
			case "BinaryExpression" :
				evaluateExpressionStatement(expression.right, context);
				evaluateExpressionStatement(expression.left, context);
				break;
			case "ConditionalExpression" :
				evaluateExpressionStatement(expression.test, context);
				evaluateExpressionStatement(expression.consequent, context);
				evaluateExpressionStatement(expression.alternate, context);
				break;
			case "Identifier" :
				context.setLocationForVariableName(expression.name, expression.loc);
				break;
			default:
				if (debug) {
					console.log("No handling of " + expression.type);	
				}
		}
	}

	function Context() {
		this.contextMapping = {};
	}

	Context.prototype.constructor = Context;
	Context.prototype.contextMapping = undefined;

	Context.prototype.linesFor = function(variableName) {
		return this.contextMapping[variableName];
	};

	Context.prototype.setLocationForVariableName = function(variableName, location) {
		if (this.contextMapping[variableName] === undefined) {
			this.contextMapping[variableName] = [];
		}

		this.contextMapping[variableName].push(location);
	};

})();