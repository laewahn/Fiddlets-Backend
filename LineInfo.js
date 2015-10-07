/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	var esprima = require("esprima");
	var ASTApi = require("./ASTApi");

	exports.infoForLine = function(line) {
		var lineInfo = {};
		lineInfo.ast = esprima.parse(line, {loc: true});
		var astTraverse = new ASTApi(lineInfo.ast, lineInfo);

		astTraverse.on("VariableDeclarator", function(declaration, info, defaultBehaviour) {

			info.lValue = {
				name: declaration.id.name,
				range: [declaration.id.loc.start.column, declaration.id.loc.end.column]
			};

			info.type = "Declaration";

			defaultBehaviour();
		});

		astTraverse.on("VariableDeclarator::Init", function(init, info, defaultBehaviour) {
			info.rValue = {
				name: init.name,
				value: init.value,
				range: [init.loc.start.column, init.loc.end.column]
			};

			info.type = "Initialisation";

			defaultBehaviour();
		});

		astTraverse.on("AssignmentExpression", function(expression, info) {

			info.lValue = {
				name: expression.left.name,
				range: [expression.left.loc.start.column, expression.left.loc.end.column]
			};

			info.rValue = {
				name: expression.right.name,
				range: [expression.right.loc.start.column, expression.right.loc.end.column]
			};

			info.type = "Assignment";
		});

		astTraverse.on("CallExpression", function(call, info) {
			info.rValue.type = "Function call";
			info.rValue.callee = {
				range: [call.callee.object.loc.start.column, call.callee.object.loc.end.column],
				name: call.callee.object.name
			};
			info.rValue.method = {
				name: call.callee.property.name,
				range: [call.callee.property.loc.start.column, call.callee.property.loc.end.column]
			};

			var paramValues = [];
			call.arguments.forEach(function(arg) {
				paramValues.push(arg.name);
			});

			var argumentsCount = call.arguments.length;
			var paramRange = [call.arguments[0].loc.start.column, call.arguments[argumentsCount -1 ].loc.end.column];

			info.rValue.params = {
				values: paramValues,
				range: paramRange
			};
		});

		astTraverse.trace();

		return lineInfo;
	};

})();