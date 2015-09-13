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

		function collectIdentifiersForASTMembers(astMembers, context) {
			return function(ifStatement, context, defaultBehaviour) {
				var identifierCollector = new IdentifierCollector(ifStatement);
				var identifiers = identifierCollector.traceFor(astMembers);
			
				identifiers.forEach(function(identifier) {
					context.setLocationForVariableName(identifier, ifStatement.loc);
				});

				defaultBehaviour();
			}
		}

		contextCollector.on("IfStatement", collectIdentifiersForASTMembers(["consequent", "alternate"]));
		contextCollector.on("ForStatement", collectIdentifiersForASTMembers(["init", "test", "update", "body"]));

		return contextCollector.trace();
	};

	function IdentifierCollector(ast) {
		this.identifiers = [];
		this.ast = ast;

		this.astAPI = new ASTApi(null, this.identifiers);

		this.astAPI.on("Identifier", function(anIdentifier, identifiers, defaultBehaviour) {
			if (identifiers.indexOf(anIdentifier.name !== -1)) {
				identifiers.push(anIdentifier.name);
			}

			defaultBehaviour();
		});
	}

	IdentifierCollector.prototype.traceFor = function(members) {
		members.forEach(function(member){
			this.astAPI.ast = this.ast[member];
			this.astAPI.trace();
		}, this);

		return this.identifiers;
	}

	IdentifierCollector.prototype.constructor = IdentifierCollector;
	IdentifierCollector.prototype.astAPI = undefined;
	IdentifierCollector.prototype.identifiers = undefined;


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