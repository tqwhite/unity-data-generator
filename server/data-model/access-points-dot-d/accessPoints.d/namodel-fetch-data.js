#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ dotD, passThroughParameters }) {
	// ================================================================================
	// INITIALIZATION

	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

	const { sqlDb, mapper, dataMapping } = passThroughParameters;

	// ================================================================================
	// SERVICE FUNCTION

	const serviceFunction = (refId, callback) => {
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Query database for NAModel element by refId

		taskList.push((args, next) => {
			const { sqlDb, mapper, refId } = args;

			if (!refId) {
				next('Missing refId parameter');
				return;
			}

			args.sqlDb.getTable('naDataModel', mergeArgs(args, next, 'naModelTable'));
		});

		taskList.push((args, next) => {
			const { naModelTable, dataMapping, refId } = args;
			const naModelMapper = dataMapping['na-data-model'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				if (!rawResult.length) {
					next(`NA Model element with refId ${refId} not found`);
					return;
				}

				// Map the result
				const element = naModelMapper.map(rawResult);

				next('', { ...args, element });
			};
			xLog.status(`HACK: goofball SheetName/refId swap here`);
			
			
			
			const query = `
				SELECT
					naDataModel.refId,
					naDataModel.Name,
					naDataModel.Mandatory,
					naDataModel.Characteristics,
					naDataModel.Type,
					naDataModel.Description,
					naDataModel.XPath,
					naDataModel.Format,
					naDataModel.SheetName,
					naDataModel.[CEDS ID],
					_CEDSElements.Definition as 'cedsDefinition',
					cedsMatches.GlobalID as 'cedsMatchesGlobalID',
					cedsMatches.Definition as 'cedsMatchesDefinition',
					cedsMatches.ElementName as 'cedsMatchesElementName',
					unityCedsMatches.confidence as 'cedsMatchesConfidence'
				FROM naDataModel 
				left join _CEDSElements on _CEDSElements.GlobalID=naDataModel.[CEDS ID]
				left join unityCedsMatches on unityCedsMatches.naDataModelRefId=naDataModel.refId
				left join _CEDSElements as cedsMatches on cedsMatches.GlobalID=unityCedsMatches._CEDSElementsRefId
				WHERE SheetName = '${refId}'
			`;
			
			
			const queryDISCARD = `
				SELECT
					naDataModel.refId,
					naDataModel.Name,
					naDataModel.Mandatory,
					naDataModel.Characteristics,
					naDataModel.Type,
					naDataModel.Description,
					naDataModel.XPath,
					naDataModel.Format,
					naDataModel.SheetName,
					naDataModel.[CEDS ID],
					_CEDSElements.Definition as 'cedsDefinition'
				FROM <!tableName!> 
				left join _CEDSElements on _CEDSElements.GlobalID=naDataModel.[CEDS ID]
				WHERE SheetName = '${refId}'
			`;
			naModelTable.getData(query, { suppressStatementLog: false, noTableNameOk:true }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, refId };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(
					`namodel-fetch-data FAILED: ${err} (${moduleName}.js)`,
				);
				callback(err);
				return;
			}

			callback('', args.element);
		});
	};

	// ================================================================================
	// Access Point Constructor

	const addEndpoint = ({ name, serviceFunction, dotD }) => {
		dotD.logList.push(name);
		dotD.library.add(name, serviceFunction);
	};

	// ================================================================================
	// Do the constructing

	const name = 'namodel-fetch-data';

	addEndpoint({ name, serviceFunction, dotD });

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;