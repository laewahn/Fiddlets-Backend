/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var ASTApi = require("./ASTApi");

	var debug = false;

	exports.setDebug = function(debugFlag) {
		debug = debugFlag;
	};

	exports.getContextFor = function(source) {
		var ast = esprima.parse(source, {loc: true});

		var contextCollector = new ASTApi(ast, new Context());
		contextCollector.setDebug(debug);

		contextCollector.on("VariableDeclaration", function(line, context, defaultBehaviour) {
			line.declarations.forEach(function(declaration) {
				context.setLocationForVariableName(declaration.id.name, declaration.loc);
			});
			
			defaultBehaviour();
		});
		
		contextCollector.on("Identifier", function(identifier, context, defaultBehaviour) {
			context.setLocationForVariableName(identifier.name, identifier.loc);
			defaultBehaviour();
		});

		contextCollector.on("FunctionDeclaration", function(functionExpression, context, defaultBehaviour) {
			context.setLocationForVariableName(functionExpression.id.name, functionExpression.loc);
			defaultBehaviour();
		});

		contextCollector.on("IfStatement", function(ifStatement, context, defaultBehaviour) {
			var identifiers = [];
			var identifierCollector = new ASTApi(null, identifiers);
			
			identifierCollector.on("Identifier", function(identifier, collector, defaultBehaviour) {
				if (collector.indexOf(identifier.name !== -1)) {
					collector.push(identifier.name);
				}
				
				defaultBehaviour();
			});

			identifierCollector.ast = ifStatement.consequent;
			identifierCollector.trace();

			identifierCollector.ast = ifStatement.alternate;
			identifierCollector.trace();
			
			identifiers.forEach(function(identifier) {
				context.setLocationForVariableName(identifier, ifStatement.loc);
			});

			defaultBehaviour();
		});

		contextCollector.on("ForStatement", function(loop, context, defaultBehaviour) {
			var identifiers = [];
			var identifierCollector = new ASTApi(null, identifiers);
			
			identifierCollector.on("Identifier", function(identifier, collector, defaultBehaviour) {
				if (collector.indexOf(identifier.name !== -1)) {
					collector.push(identifier.name);
				}
				
				defaultBehaviour();
			});

			identifierCollector.ast = loop.init;
			identifierCollector.trace();

			identifierCollector.ast = loop.test;
			identifierCollector.trace();
			
			identifierCollector.ast = loop.update;
			identifierCollector.trace();

			identifierCollector.ast = loop.body;
			identifierCollector.trace();
			
			identifiers.forEach(function(identifier) {
				context.setLocationForVariableName(identifier, loop.loc);
			});

			defaultBehaviour();
		});

		return contextCollector.trace();
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