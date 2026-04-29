import { useState, useEffect, useMemo } from 'react';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

interface PhotoInfo {
  /** 格式化时间，如 "2024-01-15 14:30" */
  time: string;
  /** 中文地址，如 "上海市浦东新区"，无位置信息时为 null */
  location: string | null;
  /** 是否正在加载地址 */
  locationLoading: boolean;
}

/** 坐标缓存：避免重复调用逆地理编码 */
const geoCache = new Map<string, string>();

function coordsKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * 从 Asset 中提取并格式化拍摄时间和地点
 * - 时间：直接从 creationTime 获取（单位：毫秒）
 * - 地点：通过 getAssetInfoAsync 获取经纬度，再用逆地理编码转为中文地址（带缓存）
 *
 * 注意：Asset.location 不在 getAssetsAsync 默认返回中，
 * 必须调用 MediaLibrary.getAssetInfoAsync() 才能获取 GPS 信息
 */
export function usePhotoInfo(photo: MediaLibrary.Asset | null): PhotoInfo {
  // ---- 时间（同步） ----
  // 注意：Asset.creationTime 单位是毫秒（非秒），直接传给 Date 构造函数
  const time = useMemo(() => {
    if (!photo?.creationTime || photo.creationTime === 0) return '';
    const d = new Date(photo.creationTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [photo]);

  // ---- 地点（异步：获取 AssetInfo → 逆地理编码） ----
  const [location, setLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!photo) {
      setLocation(null);
      return;
    }

    let cancelled = false;
    setLocationLoading(true);

    // 第一步：通过 getAssetInfoAsync 获取包含 location 的完整信息
    MediaLibrary.getAssetInfoAsync(photo)
      .then(info => {
        if (cancelled) return;

        const loc = info?.location;
        // 防御性校验：location 必须存在且坐标可转为有效数字
        if (!loc) {
          setLocation(null);
          setLocationLoading(false);
          return;
        }
        const latitude = Number(loc.latitude);
        const longitude = Number(loc.longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
          setLocation(null);
          setLocationLoading(false);
          return;
        }

        const key = coordsKey(latitude, longitude);

        // 命中坐标缓存
        if (geoCache.has(key)) {
          if (!cancelled) {
            setLocation(geoCache.get(key)!);
            setLocationLoading(false);
          }
          return;
        }

        // 第二步：逆地理编码转中文地址
        return Location.reverseGeocodeAsync({ latitude, longitude })
          .then(results => {
            if (cancelled) return;
            if (results.length > 0) {
              const r = results[0];
              const parts: string[] = [];
              if (r.district) parts.push(r.district);
              if (r.city && r.city !== r.district) parts.push(r.city);
              if (r.subregion && r.subregion !== r.city) parts.push(r.subregion);
              if (r.region && r.region !== r.subregion) parts.push(r.region);
              const addr = parts.join('') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
              geoCache.set(key, addr);
              setLocation(addr);
            } else {
              const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
              geoCache.set(key, fallback);
              setLocation(fallback);
            }
          });
      })
      .catch(e => {
        console.warn('usePhotoInfo: 获取位置失败', e.message ?? e);
        if (!cancelled) setLocation(null);
      })
      .finally(() => {
        if (!cancelled) setLocationLoading(false);
      });

    return () => { cancelled = true; };
  }, [photo]);

  return { time, location, locationLoading };
}
