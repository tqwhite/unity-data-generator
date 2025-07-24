## **qtools-x-log**

Application-specific logging done the way TQ wants it. Respects command-line flags, outputs to appropriate streams, and handles file logging with style.

The module reads command-line parameters directly and provides multiple output methods that respect flags like `-silent`, `-quiet`, `-verbose`, and `-debug`. Everything routes through the right streams with proper colorization.

**EG,**

```javascript
const xLog = require('qtools-x-log');

xLog.status('Application starting up');
xLog.result(JSON.stringify(data)); // goes to stdout
xLog.error('Something went wrong'); // goes to stderr in red
xLog.emphatic('IMPORTANT MESSAGE'); // highlighted background
```

### **Command-Line Flag Awareness:**

The module automatically respects these flags from `qtools-parse-command-line`:

- **`-silent`**: Suppresses all output except errors
- **`-quiet`**: Suppresses status and emphatic messages, allows results
- **`-verbose`**: Enables verbose output when verbose() is called
- **`-debug`**: Enables debug output with special formatting
- **`-noColor`**: Disables color output, uses plain text alternatives

### **Basic Logging Methods:**

- **error**: Red-colored output to stderr. Uses JSON.stringify for objects.
- **result**: Plain output to stdout (process.stdout.write). Never suppressed by silent flag.
- **status**: General status messages to stderr. Suppressed by silent/quiet flags.
- **emphatic**: Highlighted messages (yellow on black background, or *** asterisks *** with noColor).
- **verbose**: Verbose messages only shown when `-verbose` flag is set.
- **debug**: Debug messages with special formatting when `-debug` flag is set. Supports label option.

### **Advanced Features:**

- **progress**: Status messages that can be toggled on/off independently of other flags.
- **setProgressMessageStatus**: Toggle progress messages without affecting other output.
- **logToStdOut**: Switch all output from stderr to stdout (except result, which always uses stdout).

### **File Operations:**

- **setProcessFilesDirectory**: Creates and sets directory for process detail files.
- **getProcessFilesDirectory**: Returns current process files directory.
- **saveProcessFile**: Saves data to files with JSON serialization option and append mode.

### **Object Handling:**

Objects are handled differently depending on the method:

- **Error messages** use `JSON.stringify()` for clean serialization
- **Status/verbose/debug** use `util.inspect()` for detailed object visualization with color support
- **Color output** respects the `noColor` flag throughout

### **Stream Routing:**

- **Default**: Most output goes to stderr (console.error)
- **Result**: Always uses stdout (process.stdout.write) 
- **After logToStdOut()**: All output switches to stdout (console.log)
- **File output**: Separate from console streams, controlled independently

### **Utilities:**

- **annotation**: String containing module filename and info message
- **color**: Direct access to chalk color instance for custom formatting

### **Version Notes:**

**1.0.7** Current version includes enhanced object formatting with `util.inspect()` integration, `noColor` flag support, and the `logToStdOut()` method for flexible stream routing. The module maintains full compatibility with existing qtools command-line parameter patterns. Adds tests and comprehensive README.

No crashes if directories don't exist - `setProcessFilesDirectory()` creates them recursively. JSON serialization handles most JavaScript types gracefully.

### **Other Cool Qtools**

[qtools-asynchronous-pipe-plus](https://www.npmjs.com/package/qtools-asynchronous-pipe-plus)
[qtools-config-file-processor](https://www.npmjs.com/package/qtools-config-file-processor)
[qtools-format-columns](https://www.npmjs.com/package/qtools-format-columns)
[qtools-functional-library](https://www.npmjs.com/package/qtools-functional-library)
[qtools-object-flattener](https://www.npmjs.com/package/qtools-object-flattener)
[qtools-parse-command-line](https://www.npmjs.com/package/qtools-parse-command-line)
[qtools-secure-container](https://www.npmjs.com/package/qtools-secure-container)
[qtools-template-replace-for-files](https://www.npmjs.com/package/qtools-template-replace-for-files)
[qtools-transform-text](https://www.npmjs.com/package/qtools-transform-text)