/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module, require */

(function() {
	"use strict";

	var escodegen = require("escodegen");

	function ASTApi(ast, collector) {
		this.ast = ast;
		this.collector = collector;
		this.visitors = {};

		this.defaultVisitors = {
			"Program" : function(program) {
				program.body.forEach(function(line) {
					this._traceToken(line);
				}, this);
			},

			"BlockStatement" : function(block) {
				block.body.forEach(function(line) {
					this._traceToken(line);
				}, this);
			},

			"VariableDeclaration" : function(line) {
				line.declarations.forEach(function(declaration) {
					if (declaration.init !== null) {
						this._traceToken(declaration.init);
					}

					this._traceToken(declaration);
				}, this);
			},

			"FunctionDeclaration" : this._traceBodyAndParams,
			"FunctionExpression" : this._traceBodyAndParams,

			"ExpressionStatement": function(line) {
				this._traceToken(line.expression);
			},

			"IfStatement": function(line) {
				this._traceToken(line.test);
				this._traceToken(line.consequent);
				this._traceToken(line.alternate);
			},

			"AssignmentExpression" : function(expression) {
				this._traceToken(expression.left);
				this._traceToken(expression.right);
			},

			"CallExpression" : function(expression) {
				expression.arguments.forEach(function(argument) {
					this._traceToken(argument);
				}, this);

				this._traceToken(expression.callee);
			},

			"MemberExpression" : function(expression) {
				this._traceToken(expression.object);
			},


			"BinaryExpression" : function(expression) {
				this._traceToken(expression.right);
				this._traceToken(expression.left);
			},
			
			"ConditionalExpression" : function(expression) {
				this._traceToken(expression.test);
				this._traceToken(expression.consequent);
				this._traceToken(expression.alternate);
			}, 

			"ForStatement" : function(loop) {
				this._traceToken(loop.init);
				this._traceToken(loop.test);
				this._traceToken(loop.update);
				this._traceToken(loop.body);
			},

			"UpdateExpression" : function(expression) {
				this._traceToken(expression.argument);
			},

			"Literal" : this._noop,
			"Identifier" : this._noop
		};
	}

	ASTApi.prototype.ast = undefined;
	ASTApi.prototype.collector = undefined;
	ASTApi.prototype.visitors = undefined;
	ASTApi.prototype.defaultVisitors = undefined;
	ASTApi.prototype.debug = false;

	ASTApi.prototype.setDebug = function(debug) {
		this.debug = debug;
	};

	ASTApi.prototype.on = function(type, visitor) {
		this.visitors[type] = visitor;
	};

	ASTApi.prototype.trace = function() {
		this._traceToken(this.ast);
		return this.collector;
	};

	ASTApi.prototype.generatedCode = function() {
		return escodegen.generate(this.ast);
	};

	ASTApi.prototype._traceToken = function(token) {		
		var defaultBehaviour = this._visitorForToken(token.type).bind(this);

		var visitor = this.visitors[token.type];
		if (visitor === undefined) {
			visitor = defaultBehaviour;
		}

		var defaultBehaviourWrapper = function() {
			defaultBehaviour(token, this.collector);
		}.bind(this);

		visitor(token, this.collector, defaultBehaviourWrapper);
	};

	ASTApi.prototype._visitorForToken = function(type) {
		var defaultVisitor = this.defaultVisitors[type];

		return (defaultVisitor !== undefined) ? defaultVisitor : function(token) {
			if (this.debug) {
				console.error("Token not supported: " + token.type);
			}
		};
	};

	ASTApi.prototype._traceBodyAndParams = function(theFunction) {
		theFunction.params.forEach(function(param) {
			this._traceToken(param);
		}, this);
	
		this._traceToken(theFunction.body);
	};

	ASTApi.prototype._noop = function() {};

	module.exports = ASTApi;

})();

