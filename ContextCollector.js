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
		contextCollector.setDebug(debug);

		return contextCollector.trace();
	};

	function ASTApi(ast, collector) {
		this.ast = ast;
		this.collector = collector;
	}

	ASTApi.prototype.ast = undefined;
	ASTApi.prototype.collector = undefined;
	ASTApi.prototype.debug = false;

	ASTApi.prototype.setDebug = function(debug) {
		this.debug = debug;
	}

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
							this._evaluateExpressionStatement(declaration.init, collector);
						}
					}, this);
					break;
				case "FunctionDeclaration" :					
					collector.setLocationForVariableName(line.id.name, line.loc);
					break;
				case "ExpressionStatement" :
					this._evaluateExpressionStatement(line.expression, collector);
					break;
				case "IfStatement" :
					this._evaluateExpressionStatement(line.test, collector);
					break;
				default:
					if (this.debug) {
						console.error("Token not supported: " + line.type);	
					}
			}
		}, this);
	};

	ASTApi.prototype._evaluateExpressionStatement = function(expression, collector) {
		if (collector === null) {
			throw "!!!You forgot to pass over the collector!!!";
		}

		switch(expression.type) {
			case "AssignmentExpression" :
				this._evaluateExpressionStatement(expression.left, collector);
				this._evaluateExpressionStatement(expression.right, collector);
				break;
			case "CallExpression" :
				expression.arguments.forEach(function(argument) {
					this._evaluateExpressionStatement(argument, collector);
				}, this);

				this._evaluateExpressionStatement(expression.callee, collector);
				break;
			case "MemberExpression" :
				this._evaluateExpressionStatement(expression.object, collector);
				break;
			case "FunctionExpression" :
				expression.params.forEach(function(param) {
					this._evaluateExpressionStatement(param, collector);
				}, this);
				break;
			case "BinaryExpression" :
				this._evaluateExpressionStatement(expression.right, collector);
				this._evaluateExpressionStatement(expression.left, collector);
				break;
			case "ConditionalExpression" :
				this._evaluateExpressionStatement(expression.test, collector);
				this._evaluateExpressionStatement(expression.consequent, collector);
				this._evaluateExpressionStatement(expression.alternate, collector);
				break;
			case "Identifier" :
				collector.setLocationForVariableName(expression.name, expression.loc);
				break;
			default:
				if (this.debug) {
					console.log("No handling of " + expression.type);	
				}
		}
	};

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