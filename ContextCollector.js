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

		contextCollector.setVisitorForType("VariableDeclaration", function(line, collector, defaultBehaviour) {
			line.declarations.forEach(function(declaration) {
				collector.setLocationForVariableName(declaration.id.name, declaration.loc);
			});
			
			defaultBehaviour();
		});
		
		contextCollector.setVisitorForType("Identifier", function(identifier, collector, defaultBehaviour) {
			collector.setLocationForVariableName(identifier.name, identifier.loc);
			defaultBehaviour();
		});

		contextCollector.setVisitorForType("FunctionDeclaration", function(functionExpression, collector, defaultBehaviour) {
			collector.setLocationForVariableName(functionExpression.id.name, functionExpression.loc);
			defaultBehaviour();
		});
		
		contextCollector.setDebug(debug);

		return contextCollector.trace();
	};

	function ASTApi(ast, collector) {
		this.ast = ast;
		this.collector = collector;
		this.visitors = {};
	}

	ASTApi.prototype.ast = undefined;
	ASTApi.prototype.collector = undefined;
	ASTApi.prototype.visitors = undefined;
	ASTApi.prototype.defaultVisitors = undefined;
	ASTApi.prototype.debug = false;

	ASTApi.prototype.setDebug = function(debug) {
		this.debug = debug;

		this.defaultVisitors = {
			"VariableDeclaration" : function(line) {
				line.declarations.forEach(function(declaration) {
					if (declaration.init !== null) {
						this._evaluateExpressionStatement(declaration.init);
					}
				}, this);
			},

			"FunctionDeclaration" : function() {
				// TODO: Probably scan the body of the function here.
			},

			"ExpressionStatement": function(line) {
				this._evaluateExpressionStatement(line.expression);
			},

			"IfStatement": function(line) {
				this._evaluateExpressionStatement(line.test);
				// TODO: evaluate the whole block for consequence and alternate
			}
		};
	};

	ASTApi.prototype.setVisitorForType = function(type, visitor) {
		this.visitors[type] = visitor;
	};

	ASTApi.prototype.trace = function() {
		this._traceBody(this.ast.body);
		return this.collector;
	};

	ASTApi.prototype._traceBody = function(body) {
		body.forEach(function(line) {
			var defaultVisitor = this.defaultVisitors[line.type];
			if (defaultVisitor !== undefined) {
				this._callVisitorWithDefaultBehaviorForElement(line, defaultVisitor.bind(this));
			} else {
				this._callVisitorWithDefaultBehaviorForElement(line, this._defaultTraceLineBehaviour.bind(this));
			}
		}, this);
	};

	ASTApi.prototype._evaluateExpressionStatement = function(expression) {
		this._callVisitorWithDefaultBehaviorForElement(expression, this._defaultExpressionBehaviour.bind(this));
	};

	ASTApi.prototype._callVisitorWithDefaultBehaviorForElement = function(element, defaultBehaviour) {
		var visitor = this.visitors[element.type];

		var defaultWrapper = function() {
			defaultBehaviour(element, this.collector);
		}.bind(this);
		
		if (visitor !== undefined) 
			visitor(element, this.collector, defaultWrapper);
		else
			defaultBehaviour(element, this.collector);
	};

	ASTApi.prototype._defaultTraceLineBehaviour = function(line) {
		switch(line.type) {
			default:
				if (this.debug) {
					console.error("Token not supported: " + line.type);	
				}
		}
	};

	ASTApi.prototype._defaultExpressionBehaviour = function(expression) {
		switch(expression.type) {
			case "AssignmentExpression" :
				this._evaluateExpressionStatement(expression.left);
				this._evaluateExpressionStatement(expression.right);
				break;
			case "CallExpression" :
				expression.arguments.forEach(function(argument) {
					this._evaluateExpressionStatement(argument);
				}, this);

				this._evaluateExpressionStatement(expression.callee);
				break;
			case "MemberExpression" :
				this._evaluateExpressionStatement(expression.object);
				break;
			case "FunctionExpression" :
				expression.params.forEach(function(param) {
					this._evaluateExpressionStatement(param);
				}, this);
				break;
			case "BinaryExpression" :
				this._evaluateExpressionStatement(expression.right);
				this._evaluateExpressionStatement(expression.left);
				break;
			case "ConditionalExpression" :
				this._evaluateExpressionStatement(expression.test);
				this._evaluateExpressionStatement(expression.consequent);
				this._evaluateExpressionStatement(expression.alternate);
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