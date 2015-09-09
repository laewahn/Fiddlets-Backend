/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");

	exports.getContextFor = function (source) {
		var ast = esprima.parse(source, {loc: true});

		var contextMapping = {};
		traceBody(ast.body, contextMapping);

		return new Context(contextMapping);
	};

	function traceBody(body, context) {
		body.forEach(function(line) {
			// console.log(JSON.stringify(line, null, 2));
			switch(line.type) {
				case "VariableDeclaration" :
					line.declarations.forEach(function(declaration) {
						var variableName = declaration.id.name;
						var variableLocation = declaration.loc;

						if (context[variableName] === undefined) {
							context[variableName] = [];
						}

						if (declaration.init !== null) {
							evaluateExpressionStatement(declaration.init, context);
						}
						context[variableName].push(variableLocation);
					});
					break;
				case "FunctionDeclaration" :
					var variableName = line.id.name;
					var variableLocation = line.loc;
					if (context[variableName] === undefined) {
						context[variableName] = [];
					}

					context[variableName].push(variableLocation);
					break;
				case "ExpressionStatement" :
					evaluateExpressionStatement(line.expression, context);
					break;
				default:
					// console.error("Token not supported: " + line.type);
			}
		});
	}

	function evaluateExpressionStatement(expression, context) {
		switch(expression.type) {
			case "AssignmentExpression" :
				evaluateExpressionStatement(expression.left, context);
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
			case "Identifier" :
				var variableName = expression.name;

				var expressionLocation = expression.loc;

				if (context[variableName] === undefined) {
					context[variableName] = [];
				}

				context[variableName].push(expressionLocation);
				break;
			default:
				// console.log("No handling of " + expression.type);
		}
	}

	function Context(contextMapping) {
		this.contextMapping = contextMapping;
	}

	Context.prototype.constructor = Context;
	Context.prototype.contextMapping = undefined;

	Context.prototype.linesFor = function(variableName) {
		return this.contextMapping[variableName];
	};

	Context.prototype.setLocationFor(variableName, location) {
		if (contextMapping[variableName] === undefined) {
			contextMapping[variableName] = [];
		}

		contextMapping[variableName].push(location);
	}

})();