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
					this._traceToken(declarator.init, "VariableDeclarator::Init");
				}

				this._traceToken(declarator.id);
			},

			"VariableDeclarator::Init" : function(init) {
				this._traceToken(init);
			},

			"FunctionExpression" : function(theFunction) {
				this._traceToken(theFunction.params, "Function::Params");
				this._traceToken(theFunction.body);
			},

			"FunctionDeclaration" : function(theFunction) {
				this._traceToken(theFunction.params, "Function::Params");
				this._traceToken(theFunction.body);
			},

			"Function::Params" : function(params) {
				params.forEach(function(param) {
					this._traceToken(param);
				}, this);
			},

			"ExpressionStatement": function(line) {
				this._traceToken(line.expression);
			},

			"IfStatement": function(line) {
				this._traceToken(line.test);
				this._traceToken(line.consequent);

				if (line.alternate !== null) {
					this._traceToken(line.alternate);
				}
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
				try {
					
					this._traceToken(expression.property);	
				} catch (error) {
					console.log(expression.property);
				} finally {
					this._traceToken(expression.property);
				}
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

			"ReturnStatement" : function(returnStatement) {
				if (returnStatement.argument !== null) {
					this._traceToken(returnStatement.argument);	
				}
			},

			"ThrowStatement" : function(throwStatement) {
				if (throwStatement.argument !== null) {
					this._traceToken(throwStatement.argument);
					
				}
			},

			"NewExpression" : function(newExpression) {
				this._traceToken(newExpression.callee);

				if (newExpression.arguments !== null) {
					newExpression.arguments.forEach(function(arg) {
						this._traceToken(arg);
					}, this);
				}
			},

			"ObjectExpression" : function(objectExpression) {
				objectExpression.properties.forEach(function(prop) {
					this._traceToken(prop);
				}, this);
			},

			"LogicalExpression" : function(logicalExpression) {
				this._traceToken(logicalExpression.left);
				this._traceToken(logicalExpression.right);
			},

			"UnaryExpression" : function(unaryExpression) {
				this._traceToken(unaryExpression.argument);
			},

			"ArrayExpression" : function(arrayExpression) {
				arrayExpression.elements.forEach(function(element){
					this._traceToken(element);
				}, this);
			},

			"WhileStatement" : function(whileStatement) {
				this._traceToken(whileStatement.test);
				this._traceToken(whileStatement.body);
			},

			"SwitchStatement" : function(switchStatement) {
				this._traceToken(switchStatement.discriminant);
				switchStatement.cases.forEach(function(switchCase) {
					this._traceToken(switchCase);
				}, this);
			},

			"SwitchCase" : function(switchCase) {
				if (switchCase.test !== null) {
					this._traceToken(switchCase.test);
				}
				
				switchCase.consequent.forEach(function(consequent) {
					this._traceToken(consequent);
				}, this);
			},

			"Property" : function(prop) {
				this._traceToken(prop.key);
				this._traceToken(prop.value);
			},

			"BreakStatement" : function() {},
			"ThisExpression" : function() {},
			"Literal" : function() {},
			"Identifier" : function() {},
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
				console.error("Token not supported: " + token.type /*+ " (" + token.loc.start.line + ":" + (token.loc.start.column + 1) + ")"*/);
			}
		};
	};

	module.exports = ASTApi;

})();

