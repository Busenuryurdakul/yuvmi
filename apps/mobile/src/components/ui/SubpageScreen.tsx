import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AmbientBackground } from "@/components/ui/Glass";
import { SubpageBar } from "@/components/ui/SubpageBar";
import { theme } from "@/theme";

type SubpageScreenProps = {
  title: string;
  right?: ReactNode | string;
  children: ReactNode;
  scroll?: boolean;
};

export function SubpageScreen({ title, right, children, scroll = true }: SubpageScreenProps) {
  return (
    <View style={styles.root}>
      <AmbientBackground />
      <SubpageBar title={title} right={right} />
      {scroll ? (
        <ScrollView
          style={styles.fg}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fg, styles.fill]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.mist,
    overflow: "hidden",
  },
  fg: {
    flex: 1,
    zIndex: 1,
  },
  fill: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 30,
    flexGrow: 1,
  },
});
