/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, Text,StyleSheet } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies
import styleSheet from './TabBarItem.styles';
import { TabBarItemProps } from './TabBarItem.types';
import Avatar, { AvatarVariant } from '../../Avatars/Avatar';

const TabBarItem = ({
  style,
  icon,
  iconSize,
  iconColor,
  iconBackgroundColor,
  label,
  ...props
}: TabBarItemProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const textStyles = StyleSheet.create({label:{
      // marginTop:4,
      marginBottom:10,
      color:'#000000',
      fontSize:12,
      fontFamily:'Arial',
    }});
  return (
    <TouchableOpacity {...props} style={styles.base}>
      <Avatar
        variant={AvatarVariant.Icon}
        name={icon}
        size={iconSize}
        backgroundColor={iconBackgroundColor}
        iconColor={iconColor}
      />
      <Text style={textStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

export default TabBarItem;
