import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as MediaLibrary from 'expo-media-library';
import { fontStyles } from '../utils/fonts';
import * as C from '../utils/colors';

export interface AlbumTabBarProps {
  /** 所有可用相册 */
  albums: MediaLibrary.Album[];
  /** 当前可见的相册ID集合（用于控制显示哪些） */
  visibleAlbumIds: Set<string>;
  /** 当前照片已选中的归档相册ID（中间态） */
  activeAlbumId?: string;
  /** 点击相册 Tab 的回调 */
  onAlbumPress: (albumId: string) => void;
  /** 点击管理按钮的回调 */
  onVisibleChange: (visibleIds: Set<string>) => void;
}

/**
 * 可横向滑动的相册 Tab 栏
 * - 每个相册名称为一个可点击的 Tab
 * - 相册过多时，通过"管理"按钮勾选显示哪些相册
 * - 当前照片已归属的相册高亮显示
 */
export default function AlbumTabBar({
  albums,
  visibleAlbumIds,
  activeAlbumId,
  onAlbumPress,
  onVisibleChange,
}: AlbumTabBarProps) {
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [tempSelection, setTempSelection] = useState<Set<string>>(new Set(visibleAlbumIds));

  /** 过滤出可见的相册（保持原始顺序） */
  const visibleAlbums = albums.filter(a => visibleAlbumIds.has(a.id));

  /** 打开管理弹窗时，用当前可见列表初始化临时选择 */
  const openManage = () => {
    setTempSelection(new Set(visibleAlbumIds));
    setManageModalVisible(true);
  };

  /** 确认管理选择 */
  const confirmManage = () => {
    onVisibleChange(tempSelection);
    setManageModalVisible(false);
  };

  /** 全选/取消全选 */
  const toggleSelectAll = () => {
    // 如果当前已全选，则全部取消；否则全选
    if (tempSelection.size === albums.length) {
      setTempSelection(new Set());
    } else {
      setTempSelection(new Set(albums.map(a => a.id)));
    }
  };

  /** 是否处于全选状态 */
  const isAllSelected = tempSelection.size === albums.length && albums.length > 0;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleAlbums.map(album => {
          const isActive = activeAlbumId === album.id;
          return (
            <TouchableOpacity
              key={album.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onAlbumPress(album.id)}
              activeOpacity={0.65}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
                {album.title}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* 管理按钮 */}
        <TouchableOpacity style={styles.manageBtn} onPress={openManage} activeOpacity={0.65}>
          <MaterialIcons name="tune" size={18} color={C.text.secondary} />
        </TouchableOpacity>
      </ScrollView>

      {/* 管理弹窗：勾选要显示的相册 */}
      <Modal
        visible={manageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择显示的相册</Text>
              <TouchableOpacity
                onPress={toggleSelectAll}
                activeOpacity={0.65}
                style={styles.selectAllBtn}
              >
                <MaterialIcons
                  name={isAllSelected ? 'indeterminate-check-box' : 'check-box'}
                  size={18}
                  color={C.primary}
                />
                <Text style={styles.selectAllBtnText}>
                  {isAllSelected ? '取消全选' : '全选'}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={albums}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const checked = tempSelection.has(item.id);
                return (
                  <TouchableOpacity
                    style={styles.checkItem}
                    onPress={() => {
                      setTempSelection(prev => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                    activeOpacity={0.65}
                  >
                    <MaterialIcons
                      name={checked ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={checked ? C.primary : C.text.tertiary}
                    />
                    <Text style={styles.checkItemText}>{item.title}</Text>
                  </TouchableOpacity>
                );
              }}
              style={styles.checkList}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setManageModalVisible(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmManage}>
                <Text style={styles.confirmBtnText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: C.bg.item,
  },
  tabActive: {
    backgroundColor: C.primary,
  },
  tabText: {
    ...fontStyles.small,
    color: C.text.secondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  manageBtn: {
    width: 32,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.bg.item,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },

  // 管理弹窗
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBox: {
    width: '80%',
    maxWidth: 320,
    maxHeight: '70%',
    backgroundColor: C.bg.page,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalTitle: {
    ...fontStyles.navBtn,
    fontWeight: '600',
    color: C.text.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllBtnText: {
    ...fontStyles.small,
    color: C.primary,
    fontWeight: '500',
  },
  checkList: {
    maxHeight: 360,
    paddingHorizontal: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  checkItemText: {
    ...fontStyles.navBtn,
    color: C.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#E5E5EA',
  },
  cancelBtnText: {
    ...fontStyles.btnText,
    color: C.text.secondary,
  },
  confirmBtnText: {
    ...fontStyles.btnText,
    color: C.primary,
    fontWeight: '600',
  },
});
