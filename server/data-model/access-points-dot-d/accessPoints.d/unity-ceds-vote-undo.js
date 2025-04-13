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

  const serviceFunction = (undoData, callback) => {
    const taskList = new taskListPlus();

    // --------------------------------------------------------------------------------
    // TASK: Delete vote from database

    taskList.push((args, next) => {
      const { sqlDb, dataMapping, undoData } = args;

      // Validate required fields
      if (!undoData || !undoData.refId) {
        next('Missing required field: refId');
        return;
      }

      // Get table reference for cedsMatchVotes
      sqlDb.getTable('cedsMatchVotes', mergeArgs(args, next, 'votesTable'));
    });

    taskList.push((args, next) => {
      const { votesTable, undoData } = args;
      const voteMapper = dataMapping['unity-ceds-vote'];
      
      // Delete the vote
      const deleteQuery = voteMapper.getSql('deleteVote', { 
        refId: undoData.refId 
      });
      
      votesTable.runStatement(
        deleteQuery, 
        { suppressStatementLog: true, noTableNameOk: true }, 
        (err, result) => {
          if (err) {
            next(err);
            return;
          }
          
          next('', { ...args, deleteResult: result });
        }
      );
    });

    // --------------------------------------------------------------------------------
    // TASK: Get updated vote counts

    taskList.push((args, next) => {
      const { votesTable, undoData, deleteResult } = args;
      const voteMapper = dataMapping['unity-ceds-vote'];

      // If we don't have unityCedsMatchesRefId, we can't get the counts
      if (!undoData.unityCedsMatchesRefId) {
        next('', { ...args, voteCounts: { goodCount: 0, badCount: 0 } });
        return;
      }

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
        unityCedsMatchesRefId: undoData.unityCedsMatchesRefId 
      });
      
      votesTable.getData(query, { suppressStatementLog: true, noTableNameOk: true }, localCallback);
    });

    // --------------------------------------------------------------------------------
    // INIT AND EXECUTE THE PIPELINE

    const initialData = { sqlDb, mapper, dataMapping, undoData };
    pipeRunner(taskList.getList(), initialData, (err, args) => {
      if (err) {
        xLog.error(
          `unity-ceds-vote-undo FAILED: ${err} (${moduleName}.js)`,
        );
        callback(err);
        return;
      }

      callback('', {
        success: true,
        refId: args.undoData.refId,
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

  const name = 'unity-ceds-vote-undo';

  addEndpoint({ name, serviceFunction, dotD });

  return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;