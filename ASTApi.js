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
				this._traceToken(program.body, "Program::Body");
			},

			"Program::Body" : function(body) {
				body.forEach(function(line) {
					this._traceToken(line, "Program::Body::Line");
				}, this);
			},

			"Program::Body::Line" : function(line) {
				this._traceToken(line);
			},

			"BlockStatement" : function(block) {
				block.body.forEach(function(line) {
					this._traceToken(line);
				}, this);
			},

			"VariableDeclaration" : function(line) {
				this._traceToken(line.declarations, "VariableDeclaration::Declarations");
			},

			"VariableDeclaration::Declarations" : function(declarations) {
				declarations.forEach(function(declarator){
					this._traceToken(declarator);
				}, this);
			},

			"VariableDeclarator" : function(declarator) {
				if (declarator.init !== null) {
					this._traceToken(declarator.init);
				}

				this._traceToken(declarator.id);
			},

			"FunctionExpression" : this.FunctionDeclaration,

			"FunctionDeclaration" : function(theFunction) {
				theFunction.params.forEach(function(param) {
					this._traceToken(param);
				}, this);
	
				this._traceToken(theFunction.body);
			},

			

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
				this._traceToken(expression.arguments, "CallExpression::Arguments");
				this._traceToken(expression.callee);
			},

			"CallExpression::Arguments" : function(args) {
				args.forEach(function(argument) {
					this._traceToken(argument, "CallExpression::Arguments::Argument");
				}, this);
				
			},

			"CallExpression::Arguments::Argument" : function(argument) {
				this._traceToken(argument);
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

			"Literal" : this.Noop,
			"Identifier" : this.Noop,
			"NoOp" : function() {}
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

	ASTApi.prototype._traceToken = function(token, type) {	
		var theType = type || token.type;

		var defaultBehaviour = this._visitorForToken(theType).bind(this);
		var visitor = this.visitors[theType];

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

