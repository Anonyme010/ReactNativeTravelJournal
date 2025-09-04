import React from "react";
import { TextInput, StyleSheet } from "react-native";

export default function FilterBar({ value, onChange }) {
  return (
    <TextInput
      placeholder="Filtrer par date ou lieu"
      value={value}
      onChangeText={onChange}
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
  },
});
