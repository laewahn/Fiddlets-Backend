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