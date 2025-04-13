#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
  'qtools-asynchronous-pipe-plus',
)();

//START OF moduleFunction() ============================================================

const moduleFunction = function ({
  dotD: endpointsDotD,
  passThroughParameters,
}) {
  // ================================================================================
  // INITIALIZATION

  const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
  const localConfig = getConfig(moduleName);

  const {
    expressApp,
    accessTokenHeaderTools,
    accessPointsDotD,
    routingPrefix,
  } = passThroughParameters;

  // ================================================================================
  // SERVICE FUNCTIONS

  const saveVoteFunction = (permissionValidator) => (xReq, xRes, next) => {
    const taskList = new taskListPlus();

    taskList.push((args, next) =>
      args.permissionValidator(
        xReq.appValueGetter('authclaims'),
        { showDetails: false },
        forwardArgs({ next, args }),
      ),
    );

    taskList.push((args, next) => {
      const { accessTokenHeaderTools } = args;

      const localCallback = (err) => {
        if (err) {
          next(`${err.toString()} (unityCedsVote-saveVote-01)`, args);
          return;
        }
        next('', args);
      };

      accessTokenHeaderTools.refreshauthtoken(
        {
          xReq,
          xRes,
          payloadValues: {
            source: 'unityCedsVote-saveVote',
          },
        },
        localCallback,
      );
    });

    taskList.push((args, next) => {
      const { accessPointsDotD } = args;

      const localCallback = (err, saveResult) => {
        if (err) {
          next(`${err.toString()} (unityCedsVote-saveVote-02)`, args);
          return;
        }
        next(err, { ...args, saveResult });
      };
      
      const voteData = xReq.body.qtClone ? xReq.body.qtClone() : xReq.body;
      // Add username from auth claims if not provided
      if (!voteData.username) {
        voteData.username = xReq.appValueGetter('authclaims').username || 'anonymous';
      }
      
      accessPointsDotD['unity-ceds-vote-save'](voteData, localCallback);
    });

    // INIT AND EXECUTE THE PIPELINE
    const initialData = {
      accessPointsDotD,
      permissionValidator,
      accessTokenHeaderTools,
    };
    
    pipeRunner(taskList.getList(), initialData, (err, args) => {
      if (err) {
        xRes.status(500).send(`${err.toString()}`);
        return;
      }

      xRes.json(args.saveResult);
    });
  };
  
  // Function to handle vote undo
  const undoVoteFunction = (permissionValidator) => (xReq, xRes, next) => {
    const taskList = new taskListPlus();

    taskList.push((args, next) =>
      args.permissionValidator(
        xReq.appValueGetter('authclaims'),
        { showDetails: false },
        forwardArgs({ next, args }),
      ),
    );

    taskList.push((args, next) => {
      const { accessTokenHeaderTools } = args;

      const localCallback = (err) => {
        if (err) {
          next(`${err.toString()} (unityCedsVote-undoVote-01)`, args);
          return;
        }
        next('', args);
      };

      accessTokenHeaderTools.refreshauthtoken(
        {
          xReq,
          xRes,
          payloadValues: {
            source: 'unityCedsVote-undoVote',
          },
        },
        localCallback,
      );
    });

    taskList.push((args, next) => {
      const { accessPointsDotD } = args;

      const localCallback = (err, undoResult) => {
        if (err) {
          next(`${err.toString()} (unityCedsVote-undoVote-02)`, args);
          return;
        }
        next(err, { ...args, undoResult });
      };
      
      const undoData = xReq.body.qtClone ? xReq.body.qtClone() : xReq.body;
      
      // Validate required field
      if (!undoData.refId) {
        next('Missing required field: refId', args);
        return;
      }
      
      accessPointsDotD['unity-ceds-vote-undo'](undoData, localCallback);
    });

    // INIT AND EXECUTE THE PIPELINE
    const initialData = {
      accessPointsDotD,
      permissionValidator,
      accessTokenHeaderTools,
    };
    
    pipeRunner(taskList.getList(), initialData, (err, args) => {
      if (err) {
        xRes.status(500).send(`${err.toString()}`);
        return;
      }

      xRes.json(args.undoResult);
    });
  };

  // ================================================================================
  // Endpoint Constructor

  const addEndpoint = ({
    name,
    method,
    routePath,
    serviceFunction,
    expressApp,
    endpointsDotD,
    permissionValidator,
    accessTokenHeaderTools,
  }) => {
    expressApp[method](routePath, serviceFunction(permissionValidator));
    endpointsDotD.logList.push(name);
  };

  // ================================================================================
  // Do the constructing

  // Make this endpoint public as requested
  const permissionValidator = accessTokenHeaderTools.getValidator([
    'public'
  ]);
  
  // Add the save vote endpoint
  addEndpoint({
    name: 'unityCedsVote/saveVote',
    method: 'post',
    routePath: `${routingPrefix}unityCedsVote/saveVote`,
    serviceFunction: saveVoteFunction,
    expressApp,
    endpointsDotD,
    permissionValidator,
    accessTokenHeaderTools,
  });
  
  // Add the undo vote endpoint
  addEndpoint({
    name: 'unityCedsVote/undoVote',
    method: 'post',
    routePath: `${routingPrefix}unityCedsVote/undoVote`,
    serviceFunction: undoVoteFunction,
    expressApp,
    endpointsDotD,
    permissionValidator,
    accessTokenHeaderTools,
  });

  return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;