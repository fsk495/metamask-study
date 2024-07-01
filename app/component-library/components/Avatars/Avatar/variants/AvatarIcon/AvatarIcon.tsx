/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import Icon from '../../../../Icons/Icon';
import { useStyles } from '../../../../../hooks';
import { ICONSIZE_BY_AVATARSIZE } from '../../Avatar.constants';

// Internal dependencies.
import stylesheet from './AvatarIcon.styles';
import { AvatarIconProps } from './AvatarIcon.types';
import { DEFAULT_AVATARICON_SIZE } from './AvatarIcon.constants';

const AvatarIcon = ({
  size = DEFAULT_AVATARICON_SIZE,
  name,
  style,
  iconColor: iconColorProp,
  backgroundColor,
  ...props
}: AvatarIconProps) => {
  const { styles } = useStyles(stylesheet, { style, backgroundColor });
  const iconSize = ICONSIZE_BY_AVATARSIZE[size];
  const iconColor = iconColorProp || styles.icon.color;
  console.log("AvatarIcon   name  ", name)

  const imageMap = {
    Wallet: require('../../../../../../images/wallet_0.png'),
    Explore: require('../../../../../../images/find_0.png'),
    Setting: require('../../../../../../images/mine_0.png'),
  };

  const returnData = (IconsName: string) => {
    switch (IconsName) {
      case 'Wallet':
      case 'Explore':
      case 'Setting':
        return (
          <AvatarBase size={size} style={styles.base} {...props}>
            {/* <Icon name={name} size={iconSize} color={iconColor} /> */}
            <Image
              source={imageMap[IconsName]}
              style={{ 
                width: Number(iconSize), 
                height: Number(iconSize), 
                tintColor: iconColor 
              }}
            />
          </AvatarBase>
        );
      default:
        return (
          <AvatarBase size={size} style={styles.base} {...props}>
            <Icon name={name} size={iconSize} color={iconColor} />
          </AvatarBase>
        );
    }
  }
  return returnData(name);
};

export default AvatarIcon;
