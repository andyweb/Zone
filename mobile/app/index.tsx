// Entry: l'instradamento effettivo è gestito dal gating in _layout.
// Redirect verso la mappa (se non autenticato, il gating porta al login).

import { Redirect } from "expo-router";
import React from "react";

export default function Index() {
  return <Redirect href="/(app)/map" />;
}
