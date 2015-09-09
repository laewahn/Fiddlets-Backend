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
			"Program" : function(program) {
				program.body.forEach(function(line) {
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
			}
		};
	};

	ASTApi.prototype.setVisitorForType = function(type, visitor) {
		this.visitors[type] = visitor;
	};

	ASTApi.prototype.trace = function() {
		this._traceToken(this.ast);
		return this.collector;
	};

	ASTApi.prototype._traceToken = function(token) {
		var defaultVisitor = this.defaultVisitors[token.type];
		
		var defaultBehaviour = ((defaultVisitor !== undefined) ? defaultVisitor : function(token) {
			if (this.debug) {
				console.error("Token not supported: " + token.type);
			}
		}).bind(this);

		var visitor = this.visitors[token.type] ? this.visitors[token.type] : defaultBehaviour;
		visitor(token, this.collector, function() {	defaultBehaviour(token, this.collector); }.bind(this));
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