/**
 * External dependencies
 */
import {
	Text,
	View,
	Platform,
	PanResponder,
	Dimensions,
	ScrollView,
	Keyboard,
	StatusBar,
	TouchableHighlight,
} from 'react-native';
import Modal from 'react-native-modal';
import SafeArea from 'react-native-safe-area';

/**
 * WordPress dependencies
 */
import { subscribeAndroidModalClosed } from '@wordpress/react-native-bridge';
import { Component } from '@wordpress/element';
import { withPreferredColorScheme } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import styles from './styles.scss';
import Button from './button';
import Cell from './cell';
import CyclePickerCell from './cycle-picker-cell';
import PickerCell from './picker-cell';
import SwitchCell from './switch-cell';
import RangeCell from './range-cell';
import ColorCell from './color-cell';
import RadioCell from './radio-cell';
import NavigationScreen from './bottom-sheet-navigation/navigation-screen';
import NavigationContainer from './bottom-sheet-navigation/navigation-container';
import KeyboardAvoidingView from './keyboard-avoiding-view';
import { BottomSheetProvider } from './bottom-sheet-context';

class BottomSheet extends Component {
	constructor() {
		super( ...arguments );
		this.onSafeAreaInsetsUpdate = this.onSafeAreaInsetsUpdate.bind( this );
		this.onScroll = this.onScroll.bind( this );
		this.isScrolling = this.isScrolling.bind( this );
		this.onShouldEnableScroll = this.onShouldEnableScroll.bind( this );
		this.onShouldSetBottomSheetMaxHeight = this.onShouldSetBottomSheetMaxHeight.bind(
			this
		);

		this.onDimensionsChange = this.onDimensionsChange.bind( this );
		this.onCloseBottomSheet = this.onCloseBottomSheet.bind( this );
		this.onHandleClosingBottomSheet = this.onHandleClosingBottomSheet.bind(
			this
		);
		this.onHardwareButtonPress = this.onHardwareButtonPress.bind( this );
		this.onHandleHardwareButtonPress = this.onHandleHardwareButtonPress.bind(
			this
		);
		this.keyboardWillShow = this.keyboardWillShow.bind( this );
		this.keyboardDidHide = this.keyboardDidHide.bind( this );

		this.state = {
			safeAreaBottomInset: 0,
			bounces: false,
			maxHeight: 0,
			keyboardHeight: 0,
			scrollEnabled: true,
			isScrolling: false,
			handleClosingBottomSheet: null,
			handleHardwareButtonPress: null,
			isMaxHeightSet: true,
		};

		SafeArea.getSafeAreaInsetsForRootView().then(
			this.onSafeAreaInsetsUpdate
		);
		Dimensions.addEventListener( 'change', this.onDimensionsChange );
	}

	keyboardWillShow( e ) {
		const { height } = e.endCoordinates;

		this.setState( { keyboardHeight: height }, () =>
			this.onSetMaxHeight()
		);
	}

	keyboardDidHide() {
		this.setState( { keyboardHeight: 0 }, () => this.onSetMaxHeight() );
	}

	componentDidMount() {
		if ( Platform.OS === 'android' ) {
			this.androidModalClosedSubscription = subscribeAndroidModalClosed(
				() => {
					this.props.onClose();
				}
			);
		}

		this.keyboardWillShowListener = Keyboard.addListener(
			'keyboardWillShow',
			this.keyboardWillShow
		);

		this.keyboardDidHideListener = Keyboard.addListener(
			'keyboardDidHide',
			this.keyboardDidHide
		);

		this.safeAreaEventSubscription = SafeArea.addEventListener(
			'safeAreaInsetsForRootViewDidChange',
			this.onSafeAreaInsetsUpdate
		);
		this.onSetMaxHeight();
	}

	componentWillUnmount() {
		this.keyboardWillShowListener.remove();
		this.keyboardDidHideListener.remove();
		if ( this.androidModalClosedSubscription ) {
			this.androidModalClosedSubscription.remove();
		}
		if ( this.safeAreaEventSubscription === null ) {
			return;
		}
		this.safeAreaEventSubscription.remove();
		this.safeAreaEventSubscription = null;
		SafeArea.removeEventListener(
			'safeAreaInsetsForRootViewDidChange',
			this.onSafeAreaInsetsUpdate
		);
	}

	onSafeAreaInsetsUpdate( result ) {
		const { safeAreaBottomInset } = this.state;
		if ( this.safeAreaEventSubscription === null ) {
			return;
		}
		const { safeAreaInsets } = result;
		if ( safeAreaBottomInset !== safeAreaInsets.bottom ) {
			this.setState( { safeAreaBottomInset: safeAreaInsets.bottom } );
		}
	}

	onSetMaxHeight() {
		const { height, width } = Dimensions.get( 'window' );
		const { safeAreaBottomInset, keyboardHeight } = this.state;
		const statusBarHeight =
			Platform.OS === 'android' ? StatusBar.currentHeight : 0;

		// `maxHeight` when modal is opened along with a keyboard
		const maxHeightWithOpenKeyboard =
			0.95 *
			( Dimensions.get( 'window' ).height -
				keyboardHeight -
				statusBarHeight );

		// On horizontal mode `maxHeight` has to be set on 90% of width
		if ( width > height ) {
			this.setState( {
				maxHeight: Math.min( 0.9 * height, maxHeightWithOpenKeyboard ),
			} );
			//	On vertical mode `maxHeight` has to be set on 50% of width
		} else {
			this.setState( {
				maxHeight: Math.min(
					height / 2 - safeAreaBottomInset,
					maxHeightWithOpenKeyboard
				),
			} );
		}
	}

	onDimensionsChange() {
		this.onSetMaxHeight();
		this.setState( { bounces: false } );
	}

	isCloseToBottom( { layoutMeasurement, contentOffset, contentSize } ) {
		return (
			layoutMeasurement.height + contentOffset.y >=
			contentSize.height - contentOffset.y
		);
	}

	isCloseToTop( { contentOffset } ) {
		return contentOffset.y < 10;
	}

	onScroll( { nativeEvent } ) {
		if ( this.isCloseToTop( nativeEvent ) ) {
			this.setState( { bounces: false } );
		} else if ( this.isCloseToBottom( nativeEvent ) ) {
			this.setState( { bounces: true } );
		}
	}

	onShouldEnableScroll( value ) {
		this.setState( { scrollEnabled: value } );
	}

	onShouldSetBottomSheetMaxHeight( value ) {
		this.setState( { isMaxHeightSet: value } );
	}

	isScrolling( value ) {
		this.setState( { isScrolling: value } );
	}

	onHandleClosingBottomSheet( action ) {
		this.setState( { handleClosingBottomSheet: action } );
	}

	onHandleHardwareButtonPress( action ) {
		this.setState( { handleHardwareButtonPress: action } );
	}

	onCloseBottomSheet() {
		const { onClose } = this.props;
		const { handleClosingBottomSheet } = this.state;
		if ( handleClosingBottomSheet ) {
			handleClosingBottomSheet();
		}
		if ( onClose ) {
			onClose();
		}
		this.onShouldSetBottomSheetMaxHeight( true );
	}

	onHardwareButtonPress() {
		const { onClose } = this.props;
		const { handleHardwareButtonPress } = this.state;
		if ( handleHardwareButtonPress && handleHardwareButtonPress() ) {
			return;
		}
		if ( onClose ) {
			return onClose();
		}
	}

	getContentStyle() {
		const { safeAreaBottomInset } = this.state;
		return {
			flexGrow: 1,
			paddingBottom:
				( safeAreaBottomInset || 0 ) +
				styles.scrollableContent.paddingBottom,
		};
	}

	render() {
		const {
			title = '',
			isVisible,
			leftButton,
			rightButton,
			hideHeader,
			style = {},
			contentStyle = {},
			getStylesFromColorScheme,
			onDismiss,
			isChildrenScrollable,
			children,
			withHeaderSeparator = false,
			...rest
		} = this.props;
		const {
			maxHeight,
			bounces,
			safeAreaBottomInset,
			isScrolling,
			scrollEnabled,
			isMaxHeightSet,
		} = this.state;

		const panResponder = PanResponder.create( {
			onMoveShouldSetPanResponder: ( evt, gestureState ) => {
				// 'swiping-to-close' option is temporarily and partially disabled
				//	on Android ( swipe / drag is still available in the top most area - near drag indicator)
				if ( Platform.OS === 'ios' ) {
					// Activates swipe down over child Touchables if the swipe is long enough.
					// With this we can adjust sensibility on the swipe vs tap gestures.
					if ( gestureState.dy > 3 && ! bounces ) {
						gestureState.dy = 0;
						return true;
					}
				}
				return false;
			},
		} );

		const backgroundStyle = getStylesFromColorScheme(
			styles.background,
			styles.backgroundDark
		);

		const bottomSheetHeaderTitleStyle = getStylesFromColorScheme(
			styles.bottomSheetHeaderTitle,
			styles.bottomSheetHeaderTitleDark
		);

		const listProps = {
			disableScrollViewPanResponder: true,
			bounces,
			onScroll: this.onScroll,
			onScrollBeginDrag: this.onScrollBeginDrag,
			onScrollEndDrag: this.onScrollEndDrag,
			scrollEventThrottle: 16,
			contentContainerStyle: [
				styles.content,
				hideHeader && styles.emptyHeader,
				contentStyle,
				isChildrenScrollable && this.getContentStyle(),
				contentStyle,
			],
			style: isMaxHeightSet ? { maxHeight } : {},
			scrollEnabled,
			automaticallyAdjustContentInsets: false,
		};

		const WrapperView = isChildrenScrollable ? View : ScrollView;

		const getHeader = () => (
			<>
				<View style={ styles.bottomSheetHeader }>
					<View style={ styles.flex }>{ leftButton }</View>
					<Text
						style={ bottomSheetHeaderTitleStyle }
						maxFontSizeMultiplier={ 3 }
					>
						{ title }
					</Text>
					<View style={ styles.flex }>{ rightButton }</View>
				</View>
				{ withHeaderSeparator && <View style={ styles.separator } /> }
			</>
		);

		return (
			<Modal
				isVisible={ isVisible }
				style={ styles.bottomModal }
				animationInTiming={ 400 }
				animationOutTiming={ 300 }
				backdropTransitionInTiming={ 50 }
				backdropTransitionOutTiming={ 50 }
				backdropOpacity={ 0.2 }
				onBackdropPress={ this.onCloseBottomSheet }
				onBackButtonPress={ this.onHardwareButtonPress }
				onSwipe={ this.onCloseBottomSheet }
				onDismiss={ Platform.OS === 'ios' ? onDismiss : undefined }
				onModalHide={
					Platform.OS === 'android' ? onDismiss : undefined
				}
				swipeDirection="down"
				onMoveShouldSetResponder={
					scrollEnabled &&
					panResponder.panHandlers.onMoveShouldSetResponder
				}
				onMoveShouldSetResponderCapture={
					scrollEnabled &&
					panResponder.panHandlers.onMoveShouldSetResponderCapture
				}
				onAccessibilityEscape={ this.onCloseBottomSheet }
				{ ...rest }
			>
				<KeyboardAvoidingView
					behavior={ Platform.OS === 'ios' && 'padding' }
					style={ {
						...backgroundStyle,
						borderColor: 'rgba(0, 0, 0, 0.1)',
						...style,
					} }
					keyboardVerticalOffset={ -safeAreaBottomInset }
				>
					<View style={ styles.dragIndicator } />
					{ ! hideHeader && getHeader() }
					<WrapperView
						{ ...( isChildrenScrollable
							? { style: listProps.style }
							: listProps ) }
					>
						<BottomSheetProvider
							value={ {
								shouldEnableBottomSheetScroll: this
									.onShouldEnableScroll,
								shouldEnableBottomSheetMaxHeight: this
									.onShouldSetBottomSheetMaxHeight,
								isBottomSheetContentScrolling: isScrolling,
								onHandleClosingBottomSheet: this
									.onHandleClosingBottomSheet,
								onHandleHardwareButtonPress: this
									.onHandleHardwareButtonPress,
								listProps,
							} }
						>
							<TouchableHighlight accessible={ false }>
								<>{ children }</>
							</TouchableHighlight>
						</BottomSheetProvider>
						{ ! isChildrenScrollable && (
							<View style={ { height: safeAreaBottomInset } } />
						) }
					</WrapperView>
				</KeyboardAvoidingView>
			</Modal>
		);
	}
}

function getWidth() {
	return Math.min(
		Dimensions.get( 'window' ).width,
		styles.background.maxWidth
	);
}

const ThemedBottomSheet = withPreferredColorScheme( BottomSheet );

ThemedBottomSheet.getWidth = getWidth;
ThemedBottomSheet.Button = Button;
ThemedBottomSheet.Cell = Cell;
ThemedBottomSheet.CyclePickerCell = CyclePickerCell;
ThemedBottomSheet.PickerCell = PickerCell;
ThemedBottomSheet.SwitchCell = SwitchCell;
ThemedBottomSheet.RangeCell = RangeCell;
ThemedBottomSheet.ColorCell = ColorCell;
ThemedBottomSheet.RadioCell = RadioCell;
ThemedBottomSheet.NavigationScreen = NavigationScreen;
ThemedBottomSheet.NavigationContainer = NavigationContainer;

export default ThemedBottomSheet;
