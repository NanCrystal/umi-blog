import React from 'react';
import styled from 'styled-components';
import { CloseOutlined } from '@ant-design/icons/lib';

export interface IClosableImageProps {
  width?: number;
  height?: number;
  url: string;
  onRemove?: (url: string) => void;
}

const ImageWrapper = styled.div`
  position: relative;
  background: #000000;
  padding: 10px;
  display: inline-block;
  border: 1px solid #262626;

  img {
    object-fit: contain;
    background: #141414;
    display: block;
  }

  .close {
    position: absolute;
    right: -6px;
    top: -6px;
    cursor: pointer;
    color: #ffffff;
    font-size: 12px;
    transform: scale(0.833333);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid #262626;
    border-radius: 50%;
    transition: all 0.2s ease;

    &:hover {
      border-color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }
  }
`;

export const ClosableImage: React.FC<IClosableImageProps> = (props) => {
  const { width = 100, height = 100, onRemove, url } = props;

  const handleClickClose = () => {
    onRemove && onRemove(url);
  };

  return (
    <ImageWrapper>
      <img
        className="image-wrapper"
        style={{ width: `${width}px`, height: `${height}px` }}
        src={url}
        alt="closable"
      />
      <span onClick={handleClickClose} className="close">
        <CloseOutlined />
      </span>
    </ImageWrapper>
  );
};

export default ClosableImage;
