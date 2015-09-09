/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var debug = false;

	exports.setDebug = function(debugFlag) {
		debug = debugFlag;
	}

	exports.getContextFor = function (source) {
		var ast = esprima.parse(source, {loc: true});

		var context = new Context();
		traceBody(ast.body, context);

		return context;
	};

	function traceBody(body, context) {
		body.forEach(function(line) {
			// console.log(JSON.stringify(line, null, 2));
			switch(line.type) {
				case "VariableDeclaration" :
					line.declarations.forEach(function(declaration) {
						if (declaration.init !== null) {
							evaluateExpressionStatement(declaration.init, context);
						}

						context.setLocationForVariableName(declaration.id.name, declaration.loc);
					});
					break;
				case "FunctionDeclaration" :					
					context.setLocationForVariableName(line.id.name, line.loc);
					break;
				case "ExpressionStatement" :
					evaluateExpressionStatement(line.expression, context);
					break;
				default:
					if (debug) {
						console.error("Token not supported: " + line.type);	
					}
			}
		});
	}

	function evaluateExpressionStatement(expression, context) {
		if (context == null) {
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