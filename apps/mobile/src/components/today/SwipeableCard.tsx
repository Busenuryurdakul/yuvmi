import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { alert } from "@/lib/alert";
import { theme } from "@/theme";

type SwipeableCardProps = {
  children: React.ReactNode;
  onSwipe: () => void;
  label: string;
};

export function SwipeableCard({ children, onSwipe, label }: SwipeableCardProps) {
  const { width } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;

  function resetCard() {
    Animated.spring(pan.x, { toValue: 0, useNativeDriver: true }).start();
  }

  function requestDelete() {
    alert(`"${label}" silinsin mi?`, "Bu işlem geri alınamaz.", [
      { text: "Vazgeç", style: "cancel", onPress: resetCard },
      { text: "Sil", style: "destructive", onPress: onSwipe },
    ]);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: true }),
      onPanResponderRelease: (_, gestureState) => {
        const threshold = width * 0.35;
        // Swiping past the threshold no longer deletes outright — the card
        // snaps back and a confirmation is required, so an accidental swipe
        // (including one that overlaps a horizontal pager gesture) can't
        // permanently delete anything on its own.
        if (Math.abs(gestureState.dx) > threshold) {
          resetCard();
          requestDelete();
        } else {
          resetCard();
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const opacity = pan.x.interpolate({
    inputRange: [-width * 0.5, 0, width * 0.5],
    outputRange: [0.4, 1, 0.4],
    extrapolate: "clamp",
  });

  const transform = [{ translateX: pan.x }];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[{ opacity, transform }, styles.wrapper]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} sil`}
        accessibilityHint="Silmeden önce onay istenir"
        onPress={requestDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
      >
        <Text style={styles.deleteBtnText}>Sil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  wrapper: {
    width: "100%",
    // Support web cursor drag. RN's ViewStyle.cursor type only allows
    // 'auto' | 'pointer'; react-native-web also renders 'grab', but that
    // can't be added via declaration merging since cursor is a plain
    // property, not an overloaded method.
    cursor: "grab" as unknown as ViewStyle["cursor"],
    userSelect: "none",
  },
  deleteBtn: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  deleteBtnPressed: {
    opacity: 0.6,
  },
  deleteBtnText: {
    fontFamily: theme.font.sansSemibold,
    fontWeight: theme.font.weight.semibold,
    fontSize: 12,
    color: theme.color.danger,
  },
});
