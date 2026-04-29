import React from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient'; // ✨ 引入渐变蒙版支持
import { PhotoStatus } from '../utils/constants';

const { width, height } = Dimensions.get('window');

// 触发阈值（降低为固定像素，极大幅度提升灵敏度）
const SWIPE_Y_THRESHOLD = 80; 
const SWIPE_X_THRESHOLD = 80;
const LOCK_THRESHOLD = 5; // 轴向锁定的死区阈值

// 极速飞出动画配置，告别拖沓，更爽快
const fastSpringConfig = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

interface Props {
  uri: string;
  status?: PhotoStatus; // 用于撤回时高亮历史状态
  horizontalSwipeActive?: import('react-native-reanimated').SharedValue<boolean>; // 父组件传入的左右滑动共享变量
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const SwipeCard = ({ uri, status, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight }: Props) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const isThresholdExceeded = useSharedValue(false);
  
  // 轴向锁定状态：0 = 自由态, 1 = 锁定水平(X), 2 = 锁定垂直(Y)
  const dominantAxis = useSharedValue(0); 

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    // 轴向锁定和震动反馈保持不变
    const rawX = event.nativeEvent.translationX;
    const rawY = event.nativeEvent.translationY;
    const absX = Math.abs(rawX);
    const absY = Math.abs(rawY);

    if (dominantAxis.value === 0 && (absX > LOCK_THRESHOLD || absY > LOCK_THRESHOLD)) {
      dominantAxis.value = absX > absY ? 1 : 2;
    }

    if (dominantAxis.value === 1) {
      translateX.value = rawX;
      translateY.value = 0;
    } else if (dominantAxis.value === 2) {
      translateX.value = 0;
      translateY.value = rawY;
    }

    const exceededY = dominantAxis.value === 2 && Math.abs(translateY.value) > SWIPE_Y_THRESHOLD;
    const exceededX = dominantAxis.value === 1 && Math.abs(translateX.value) > SWIPE_X_THRESHOLD;
    
    if ((exceededY || exceededX) && !isThresholdExceeded.value) {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      isThresholdExceeded.value = true;
    } else if (!exceededY && !exceededX && isThresholdExceeded.value) {
      isThresholdExceeded.value = false;
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) { // 手指松开
      // 根据主要轴的位移来判定动作，确保飞出成功后淡出背景
      if (dominantAxis.value === 2) {
        if (translateY.value < -SWIPE_Y_THRESHOLD) {
          // ✨ 改进：飞出动画结束后，在完成回调里才触发业务逻辑
          translateY.value = withSpring(-height, fastSpringConfig, () => runOnJS(onSwipeUp)());
        } else if (translateY.value > SWIPE_Y_THRESHOLD) {
          translateY.value = withSpring(height, fastSpringConfig, () => runOnJS(onSwipeDown)());
        } else {
          translateY.value = withSpring(0);
        }
      } else if (dominantAxis.value === 1) {
        if (translateX.value < -SWIPE_X_THRESHOLD) {
          translateX.value = withSpring(-width, fastSpringConfig, () => runOnJS(onSwipeLeft)());
        } else if (translateX.value > SWIPE_X_THRESHOLD) {
          translateX.value = withSpring(width, fastSpringConfig, () => runOnJS(onSwipeRight)());
        } else {
          translateX.value = withSpring(0);
        }
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      isThresholdExceeded.value = false;
      dominantAxis.value = 0; 
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    // 根据主要轴的位移来计算透明度，实现平移淡出
    const mainOffset = dominantAxis.value === 1 ? Math.abs(translateX.value) : Math.abs(translateY.value);
    const opacity = interpolate(mainOffset, [0, Math.max(SWIPE_Y_THRESHOLD, SWIPE_X_THRESHOLD) * 1.5], [1, 0], Extrapolate.CLAMP);

    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
      ],
      opacity: opacity // 确保淡出动画使用的是 mainOffset
    };
  });

  const renderGradientOverlay = () => {
    // 根据历史状态决定蒙层颜色
    if (status === PhotoStatus.PENDING_DELETE) {
      return (
        <LinearGradient
          colors={['rgba(255, 59, 48, 0.7)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      );
    }
    if (status === PhotoStatus.PROCESSED) {
      return (
        <LinearGradient
          colors={['transparent', 'rgba(52, 199, 89, 0.7)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      );
    }
    return null;
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
        <Animated.View style={[styles.card, animatedStyle]}>
          {/* ✨ 优化照片加载动画，缩短 transition 时间 */}
          <Image source={{ uri }} style={styles.image} contentFit="cover" transition={100} />
          {renderGradientOverlay()}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: height * 0.7,
    alignSelf: 'center',
    marginTop: height * 0.1,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden'
  },
  image: { flex: 1 }
});