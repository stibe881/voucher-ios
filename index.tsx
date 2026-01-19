
import { AppRegistry } from 'react-native';
import App from './App';

const appName = 'VoucherVault';

// Register the main component
AppRegistry.registerComponent(appName, () => App);

// Mount the application to the root div
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
