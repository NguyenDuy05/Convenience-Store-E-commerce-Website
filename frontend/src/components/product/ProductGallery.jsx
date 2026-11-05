import { useEffect, useState } from 'react';
import Icon from '../common/Icon';

// Ảnh sản phẩm: ảnh lớn + dải ảnh nhỏ để chọn. Chưa có ảnh thì hiện khung giữ chỗ.
export default function ProductGallery({ images = [], name }) {
    const [active, setActive] = useState(0);
    useEffect(() => { setActive(0); }, [images.join('|')]);
    const list = images.filter(Boolean);

    if (!list.length) {
        return (
            <div className="pd-gallery">
                <div className="pd-main pd-noimg"><Icon name="image_not_supported" size="lg" /><span>Chưa có ảnh sản phẩm</span></div>
            </div>
        );
    }
    return (
        <div className="pd-gallery">
            <div className="pd-main"><img src={list[active] || list[0]} alt={name} /></div>
            {list.length > 1 && (
                <div className="pd-thumbs" role="tablist" aria-label="Ảnh sản phẩm">
                    {list.map((src, i) => (
                        <button key={src + i} type="button" role="tab" aria-selected={i === active} aria-label={`Ảnh ${i + 1}`} className={`pd-thumb${i === active ? ' on' : ''}`} onClick={() => setActive(i)}>
                            <img src={src} alt="" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}