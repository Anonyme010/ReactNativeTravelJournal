import { registerRootComponent } from "expo";
import App from "./App";

// Expo enregistre automatiquement App comme composant racine
registerRootComponent(App);

// On exporte App si jamais on veut l'importer ailleurs
export default App;
