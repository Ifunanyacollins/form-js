import { useCallback, useContext, useMemo, useRef, useState } from 'preact/hooks';
import useOptionsAsync, { LOAD_STATES } from '../../../hooks/useOptionsAsync';
import useCleanupSingleSelectValue from '../../../hooks/useCleanupSingleSelectValue';

import { FormContext } from '../../../context';

import XMarkIcon from '../icons/XMark.svg';
import AngelDownIcon from '../icons/AngelDown.svg';
import AngelUpIcon from '../icons/AngelUp.svg';

import {
  prefixId,
} from '../../Util';

import classNames from 'classnames';

import DropdownList from './DropdownList';
import { findIndex } from 'min-dash';

export default function SimpleSelect(props) {
  const {
    id,
    disabled,
    errors,
    onBlur,
    onFocus,
    field,
    readonly,
    value
  } = props;

  const { formId } = useContext(FormContext);
  const [ isDropdownExpanded, setIsDropdownExpanded ] = useState(false);
  const selectRef = useRef();
  const inputRef = useRef();

  const {
    loadState,
    options
  } = useOptionsAsync(field);

  useCleanupSingleSelectValue({
    field,
    loadState,
    options,
    value,
    onChange: props.onChange
  });

  // We cache a map of option values to their index so that we don't need to search the whole options array every time to correlate the label
  const valueToOptionMap = useMemo(() => Object.assign({}, ...options.map((o, x) => ({ [o.value]: options[x] }))), [ options ]);

  const valueLabel = useMemo(() => value && valueToOptionMap[value] && valueToOptionMap[value].label || '', [ value, valueToOptionMap ]);

  const setValue = useCallback((option) => {
    props.onChange({ value: option && option.value || null, field });
  }, [ field, props ]);

  const displayState = useMemo(() => {
    const ds = {};
    ds.componentReady = !disabled && !readonly && loadState === LOAD_STATES.LOADED;
    ds.displayCross = ds.componentReady && value !== null && value !== undefined;
    ds.displayDropdown = !disabled && !readonly && isDropdownExpanded;
    return ds;
  }, [ disabled, isDropdownExpanded, loadState, value ]);

  const onMouseDown = useCallback((e) => {
    const input = inputRef.current;
    setIsDropdownExpanded(!isDropdownExpanded);

    if (isDropdownExpanded) {
      input.blur();
    } else {
      input.focus();
    }

    e.preventDefault();
  }, [ isDropdownExpanded ]);

  const initialFocusIndex = useMemo(() => value && findIndex(options, (o) => o.value === value) || 0, [ options, value ]);

  const onInputFocus = useCallback(() => {
    if (!readonly) {
      setIsDropdownExpanded(true);
      onFocus && onFocus();
    }
  }, [ onFocus, readonly ]);

  const onInputBlur = useCallback(() => {
    if (!readonly) {
      setIsDropdownExpanded(false);
      onBlur && onBlur();
    }
  }, [ onBlur, readonly ]);

  return <>
    <div ref={ selectRef }
      id={ prefixId(`${id}`, formId) }
      class={ classNames('fjs-input-group', { disabled, readonly }, { 'hasErrors': errors.length }) }
      onFocus={ onInputFocus }
      onBlur={ onInputBlur }
      onMouseDown={ onMouseDown }>
      <div class={ classNames('fjs-select-display', { 'fjs-select-placeholder' : !value }) } id={ prefixId(`${id}-display`, formId) }>{ valueLabel || 'Select' }</div>
      { !disabled && <input
        ref={ inputRef }
        id={ prefixId(`${id}-search`, formId) }
        class="fjs-select-hidden-input"
        value={ valueLabel }
        onFocus={ onInputFocus }
        onBlur={ onInputBlur }
        aria-describedby={ props['aria-describedby'] } />
      }
      { displayState.displayCross && <span class="fjs-select-cross" onMouseDown={ (e) => { setValue(null); e.stopPropagation(); } }><XMarkIcon /></span> }
      <span class="fjs-select-arrow">{ displayState.displayDropdown ? <AngelUpIcon /> : <AngelDownIcon /> }</span>
    </div>
    <div class="fjs-select-anchor">
      {displayState.displayDropdown && <DropdownList
        values={ options }
        getLabel={ (o) => o.label }
        initialFocusIndex={ initialFocusIndex }
        onValueSelected={ (o) => { setValue(o); setIsDropdownExpanded(false); } }
        listenerElement={ selectRef.current } />}
    </div>
  </>;
}
