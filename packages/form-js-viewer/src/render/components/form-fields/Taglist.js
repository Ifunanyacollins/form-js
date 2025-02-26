import { useContext, useMemo, useRef, useState } from 'preact/hooks';

import { useService } from '../../hooks';
import useOptionsAsync, { LOAD_STATES } from '../../hooks/useOptionsAsync';
import useCleanupMultiSelectValues from '../../hooks/useCleanupMultiSelectValues';

import { FormContext } from '../../context';
import classNames from 'classnames';

import XMarkIcon from './icons/XMark.svg';

import DropdownList from './parts/DropdownList';
import Description from '../Description';
import Errors from '../Errors';
import Label from '../Label';
import SkipLink from './parts/SkipLink';

import { sanitizeMultiSelectValue } from '../util/sanitizerUtil';

import { createEmptyOptions } from '../util/optionsUtil';

import {
  formFieldClasses,
  prefixId
} from '../Util';

const type = 'taglist';

export default function Taglist(props) {
  const {
    disabled,
    errors = [],
    onFocus,
    onBlur,
    field,
    readonly,
    value : values = []
  } = props;

  const {
    description,
    id,
    label,
    validate = {}
  } = field;

  const { required } = validate;

  const { formId } = useContext(FormContext);
  const errorMessageId = errors.length === 0 ? undefined : `${prefixId(id, formId)}-error-message`;
  const [ filter, setFilter ] = useState('');
  const [ isDropdownExpanded, setIsDropdownExpanded ] = useState(false);
  const [ isEscapeClosed, setIsEscapeClose ] = useState(false);
  const focusScopeRef = useRef();
  const inputRef = useRef();
  const eventBus = useService('eventBus');

  const {
    loadState,
    options
  } = useOptionsAsync(field);

  useCleanupMultiSelectValues({
    field,
    loadState,
    options,
    values,
    onChange: props.onChange
  });

  // We cache a map of option values to their index so that we don't need to search the whole options array every time to correlate the label
  const valueToOptionMap = useMemo(() => Object.assign({}, ...options.map((o, x) => ({ [o.value]:  options[x] }))), [ options ]);

  const hasOptionsLeft = useMemo(() => options.length > values.length, [ options.length, values.length ]);

  // Usage of stringify is necessary here because we want this effect to only trigger when there is a value change to the array
  const filteredOptions = useMemo(() => {
    if (loadState !== LOAD_STATES.LOADED) {
      return [];
    }
    return options.filter((o) => o.label && o.value && (o.label.toLowerCase().includes(filter.toLowerCase())) && !values.includes(o.value));
  }, [ filter, options, JSON.stringify(values), loadState ]);


  const selectValue = (value) => {
    if (filter) {
      setFilter('');
    }

    // Ensure values cannot be double selected due to latency
    if (values.at(-1) === value) {
      return;
    }

    props.onChange({ value: [ ...values, value ], field });
  };

  const deselectValue = (value) => {
    props.onChange({ value: values.filter((v) => v != value), field });
  };

  const onInputChange = ({ target }) => {
    setIsEscapeClose(false);
    setFilter(target.value || '');
    eventBus.fire('formField.search', { formField: field, value: target.value || '' });
  };

  const onInputKeyDown = (e) => {

    switch (e.key) {
    case 'ArrowUp':
    case 'ArrowDown':

      // We do not want the cursor to seek in the search field when we press up and down
      e.preventDefault();
      break;
    case 'Backspace':
      if (!filter && values.length) {
        deselectValue(values[values.length - 1]);
      }
      break;
    case 'Escape':
      setIsEscapeClose(true);
      break;
    case 'Enter':
      if (isEscapeClosed) {
        setIsEscapeClose(false);
      }
      break;
    }
  };

  const onElementBlur = (e) => {
    if (focusScopeRef.current.contains(e.relatedTarget)) return;
    onBlur && onBlur();
  };

  const onElementFocus = (e) => {
    if (focusScopeRef.current.contains(e.relatedTarget)) return;
    onFocus && onFocus();
  };

  const onInputBlur = (e) => {
    if (!readonly) {
      setIsDropdownExpanded(false);
      setFilter('');
    }
    onElementBlur(e);
  };

  const onInputFocus = (e) => {
    if (!readonly) {
      setIsDropdownExpanded(true);
    }
    onElementFocus(e);
  };

  const onTagRemoveClick = (event, value) => {
    const { target } = event;

    deselectValue(value);

    // restore focus if there is no next sibling to focus
    const nextTag = target.closest('.fjs-taglist-tag').nextSibling;
    if (!nextTag) {
      inputRef.current.focus();
    }
  };

  const onSkipToSearch = () => {
    inputRef.current.focus();
  };

  const shouldDisplayDropdown = useMemo(() => !disabled && loadState === LOAD_STATES.LOADED && isDropdownExpanded && !isEscapeClosed, [ disabled, isDropdownExpanded, isEscapeClosed, loadState ]);

  return <div
    ref={ focusScopeRef }
    class={ formFieldClasses(type, { errors, disabled, readonly }) }
    onKeyDown={
      (event) => {
        if (event.key === 'Enter') {
          event.stopPropagation();
          event.preventDefault();
        }
      }
    }
  >
    <Label
      label={ label }
      required={ required }
      id={ prefixId(`${id}-search`, formId) } />
    { (!disabled && !readonly && !!values.length) && <SkipLink className="fjs-taglist-skip-link" label="Skip to search" onSkip={ onSkipToSearch } /> }
    <div class={ classNames('fjs-taglist', { 'fjs-disabled': disabled, 'fjs-readonly': readonly }) }>
      { loadState === LOAD_STATES.LOADED &&
        <div class="fjs-taglist-tags">
          {
            values.map((v) => {
              return (
                <div class={ classNames('fjs-taglist-tag', { 'fjs-disabled': disabled, 'fjs-readonly': readonly }) } onMouseDown={ (e) => e.preventDefault() }>
                  <span class="fjs-taglist-tag-label">
                    { valueToOptionMap[v] ? valueToOptionMap[v].label : undefined }
                  </span>
                  { (!disabled && !readonly) && <button
                    type="button"
                    title="Remove tag"
                    class="fjs-taglist-tag-remove"
                    onFocus={ onElementFocus }
                    onBlur={ onElementBlur }
                    onClick={ (event) => onTagRemoveClick(event, v) }>

                    <XMarkIcon />
                  </button> }
                </div>
              );
            })
          }
        </div>
      }
      <input
        disabled={ disabled }
        readOnly={ readonly }
        class="fjs-taglist-input"
        ref={ inputRef }
        id={ prefixId(`${id}-search`, formId) }
        onChange={ onInputChange }
        type="text"
        value={ filter }
        placeholder={ (disabled || readonly) ? undefined : 'Search' }
        autoComplete="off"
        onKeyDown={ onInputKeyDown }
        onMouseDown={ () => setIsEscapeClose(false) }
        onFocus={ onInputFocus }
        onBlur={ onInputBlur }
        aria-describedby={ errorMessageId } />
    </div>
    <div class="fjs-taglist-anchor">
      { shouldDisplayDropdown && <DropdownList
        values={ filteredOptions }
        getLabel={ (o) => o.label }
        onValueSelected={ (o) => selectValue(o.value) }
        emptyListMessage={ hasOptionsLeft ? 'No results' : 'All values selected' }
        listenerElement={ inputRef.current } /> }
    </div>
    <Description description={ description } />
    <Errors errors={ errors } id={ errorMessageId } />
  </div>;
}

Taglist.config = {
  type,
  keyed: true,
  label: 'Tag list',
  group: 'selection',
  emptyValue: [],
  sanitizeValue: sanitizeMultiSelectValue,
  create: createEmptyOptions
};
