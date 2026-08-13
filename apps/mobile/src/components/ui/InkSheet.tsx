import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Glass } from "@/components/ui/Glass";
import { theme } from "@/theme";

type InkSheetProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function InkSheet({ children, style }: InkSheetProps) {
  return (
    <Glass intensity={52} style={[styles.sheet, style]}>
      {children}
    </Glass>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: theme.radius.sheet,
    paddingHorizontal: 19,
    paddingTop: 22,
    paddingBottom: 18,
  },
});
