const { withNativeFederation } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'mfe-app-remote',
  exposes: {
    './DatePicker': './src/app/date-picker/date-picker-element.ts',
    './DataGrid': './src/app/data-grid/data-grid-element.ts',
  },
  // Full isolation — no shared dependencies to ensure complete independence
  shared: {},
  extraSharedMappings: [],
});
