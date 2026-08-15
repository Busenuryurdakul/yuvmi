import React, { useRef } from "react";
import { Animated, PanResponder, useWindowDimensions, StyleSheet } from "react-native";

type SwipeableCardProps = {
  children: React.ReactNode;
  onSwipe: () => void;
};

export function SwipeableCard({ children, onSwipe }: SwipeableCardProps) {
  const { width } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        const threshold = width * 0.35;
        if (Math.abs(gestureState.dx) > threshold) {
          // Swipe complete (left or right)
          Animated.timing(pan.x, {
            toValue: gestureState.dx > 0 ? width : -width,
            duration: 180,
            useNativeDriver: false,
          }).start(() => {
            onSwipe();
            pan.x.setValue(0);
          });
        } else {
          // Reset card to center
          Animated.spring(pan.x, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
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
    <Animated.View
      style={[{ opacity, transform }, styles.wrapper]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    // Support web cursor drag
    ...({
      cursor: "grab",
      userSelect: "none",
    } as any),
  },
});
