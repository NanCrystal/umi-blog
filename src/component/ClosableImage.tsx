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
  background: #fff;
  padding: 10px;
  display: inline-block;
  // margin-top: 20px;
  img {
    object-fit: contain;
    background: #f9f9f9;
  }
  .close {
    position: absolute;
    right: 0;
    top: 0;
    cursor: pointer;
    color: #ff7b94;
    font-size: 12px;
    transform: scale(0.833333);
    //   background: #ff7b94;
    //   height: 14px;
    //   font-size: 8px;
    //   line-height: 10px;
    //   padding: 2px;
    //   border-radius: 50%;
    //   color: #fff;
    //   transform: translate(50%, -50%);
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
