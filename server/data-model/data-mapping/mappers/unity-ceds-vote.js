#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction =
  ({ moduleName }) =>
  ({ baseMappingProcess }) => {
    process.global = process.global ? process.global : {};
    const xLog = process.global.xLog;

    // Map columns from cedsMatchVotes table
    const inputNameMapping = {
      ['username']: 'username',
      ['unityCedsMatchesRefId']: 'unityCedsMatchesRefId',
      ['isGoodMatch']: 'isGoodMatch',
      ['refId']: 'refId'
    };

    const basicMapper = baseMappingProcess(inputNameMapping);

    const recordMapper = (inObj, direction = 'forward') => {
      const outObj = basicMapper(inObj, {direction});
      return outObj;
    };

    const mapper = (inData, direction = 'forward') => {
      if (Array.isArray(inData)) {
        return inData.map((inObj) => recordMapper(inObj, direction));
      }
      return recordMapper(inData, direction);
    };

    const getSql = (queryName, replaceObject = {}) => {
      if (typeof(queryName)=='object'){
        replaceObject=queryName;
        queryName='default'
      }
      const queries={
        default: `SELECT * FROM <!tableName!> WHERE refId = '<!refId!>'`,
        getOne: `SELECT * FROM <!tableName!> WHERE refId = '<!refId!>'`,
        getByUnityCedsMatchesRefId: `SELECT * FROM <!tableName!> WHERE unityCedsMatchesRefId = '<!unityCedsMatchesRefId!>'`,
        getGoodCount: `SELECT COUNT(*) as goodCount FROM <!tableName!> WHERE unityCedsMatchesRefId = '<!unityCedsMatchesRefId!>' AND isGoodMatch = '1'`,
        getBadCount: `SELECT COUNT(*) as badCount FROM <!tableName!> WHERE unityCedsMatchesRefId = '<!unityCedsMatchesRefId!>' AND isGoodMatch = '0'`,
        getCounts: `
          SELECT 
            (SELECT COUNT(*) FROM <!tableName!> WHERE unityCedsMatchesRefId = '<!unityCedsMatchesRefId!>' AND isGoodMatch = '1') as goodCount,
            (SELECT COUNT(*) FROM <!tableName!> WHERE unityCedsMatchesRefId = '<!unityCedsMatchesRefId!>' AND isGoodMatch = '0') as badCount
        `
      };
      const sql = queries[queryName];
      
      return sql.qtTemplateReplace(replaceObject);
    };

    return { map: mapper, getSql };
  };

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction