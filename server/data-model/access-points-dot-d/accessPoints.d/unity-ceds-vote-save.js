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
  const localConfig = getConfig(moduleName);

  const { sqlDb, mapper, dataMapping } = passThroughParameters;

  // ================================================================================
  // SERVICE FUNCTION

  const serviceFunction = (voteData, callback) => {
    const taskList = new taskListPlus();

    // --------------------------------------------------------------------------------
    // TASK: Save vote data to database

    taskList.push((args, next) => {
      const { sqlDb, dataMapping, voteData } = args;

      // Get table reference for cedsMatchVotes
      sqlDb.getTable('cedsMatchVotes', mergeArgs(args, next, 'votesTable'));
    });

    taskList.push((args, next) => {
      const { votesTable, voteData } = args;
      
      // Save the vote object
      const localCallback = (err, refId) => {
        if (err) {
          next(err);
          return;
        }

        next('', { ...args, refId });
      };

      votesTable.saveObject(voteData, { suppressStatementLog: true, noTableNameOk: true }, localCallback);
    });

    // --------------------------------------------------------------------------------
    // TASK: Get vote counts after saving

    taskList.push((args, next) => {
      const { votesTable, voteData, refId } = args;
      const voteMapper = dataMapping['unity-ceds-vote'];

      const localCallback = (err, countsResult = []) => {
        if (err) {
          next(err);
          return;
        }

        // Extract the counts from the query result
        const voteCounts = countsResult[0] || { goodCount: 0, badCount: 0 };
        
        next('', { ...args, voteCounts });
      };

      // Use the mapper to get SQL for counting votes
      const query = voteMapper.getSql('getCounts', { 
        unityCedsMatchesRefId: voteData.unityCedsMatchesRefId 
      });
      
      votesTable.getData(query, { suppressStatementLog: true, noTableNameOk: true }, localCallback);
    });

    // --------------------------------------------------------------------------------
    // INIT AND EXECUTE THE PIPELINE

    const initialData = { sqlDb, mapper, dataMapping, voteData };
    pipeRunner(taskList.getList(), initialData, (err, args) => {
      if (err) {
        xLog.error(
          `unity-ceds-vote-save FAILED: ${err} (${moduleName}.js)`,
        );
        callback(err);
        return;
      }

      callback('', {
        success: true,
        refId: args.refId,
        ...args.voteCounts
      });
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

  const name = 'unity-ceds-vote-save';

  addEndpoint({ name, serviceFunction, dotD });

  return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;