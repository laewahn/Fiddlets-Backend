/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module, require */

(function() {
	"use strict";

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
				}, this);
			},

			"FunctionDeclaration" : function() {
				// TODO: Probably scan the body of the function here.
			},

			"ExpressionStatement": function(line) {
				this._traceToken(line.expression);
			},

			"IfStatement": function(line) {
				this._traceToken(line.test);
				// TODO: evaluate the whole block for consequence and alternate
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

			"FunctionExpression" : function(expression) {
				expression.params.forEach(function(param) {
					this._traceToken(param);
				}, this);
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

			"UpdateExpression" : function(expression) {
				this._traceToken(expression.argument);
			}
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

	module.exports = ASTApi;

})();

