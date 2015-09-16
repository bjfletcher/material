(function() {
  'use strict';


  angular.module('material.components.datepicker')
      .directive('mdCalendarMonth', mdCalendarMonthDirective);


  /**
   * Private directive consumed by md-calendar. Having this directive lets the calender use
   * md-virtual-repeat and also cleanly separates the month DOM construction functions from
   * the rest of the calendar controller logic.
   */
  function mdCalendarMonthDirective() {
    return {
      require: ['^^mdCalendar', 'mdCalendarMonth'],
      scope: {offset: '=mdMonthOffset'},
      controller: CalendarMonthCtrl,
      controllerAs: 'mdMonthCtrl',
      bindToController: true,
      link: function(scope, element, attrs, controllers) {
        var calendarCtrl = controllers[0];
        var monthCtrl = controllers[1];

        monthCtrl.calendarCtrl = calendarCtrl;
        monthCtrl.generateContent();

        // The virtual-repeat re-uses the same DOM elements, so there are only a limited number
        // of repeated items that are linked, and then those elements have their bindings updataed.
        // Since the months are not generated by bindings, we simply regenerate the entire thing
        // when the binding (offset) changes.
        scope.$watch(function() { return monthCtrl.offset; }, function(offset, oldOffset) {
          if (offset != oldOffset) {
            monthCtrl.generateContent();
          }
        });
      }
    };
  }

  /** Class applied to the cell for today. */
  var TODAY_CLASS = 'md-calendar-date-today';

  /** Class applied to the selected date cell/. */
  var SELECTED_DATE_CLASS = 'md-calendar-selected-date';

  /** Class applied to the focused date cell/. */
  var FOCUSED_DATE_CLASS = 'md-focus';

  /**
   * Controller for a single calendar month.
   * @ngInject @constructor
   */
  function CalendarMonthCtrl($element, $$mdDateUtil, $mdDateLocale) {
    this.dateUtil = $$mdDateUtil;
    this.dateLocale = $mdDateLocale;
    this.$element = $element;
    this.calendarCtrl = null;

    /**
     * Number of months from the start of the month "items" that the currently rendered month
     * occurs. Set via angular data binding.
     * @type {number}
     */
    this.offset;

    /**
     * Date cell to focus after appending the month to the document.
     * @type {HTMLElement}
     */
    this.focusAfterAppend = null;
  }

  /** Generate and append the content for this month to the directive element. */
  CalendarMonthCtrl.prototype.generateContent = function() {
    var calendarCtrl = this.calendarCtrl;
    var date = this.dateUtil.incrementMonths(calendarCtrl.firstRenderableDate, this.offset);

    this.$element.empty();
    this.$element.append(this.buildCalendarForMonth(date));

    if (this.focusAfterAppend) {
      this.focusAfterAppend.classList.add(FOCUSED_DATE_CLASS);
      this.focusAfterAppend.focus();
      this.focusAfterAppend = null;
    }
  };

  /**
   * Creates a single cell to contain a date in the calendar with all appropriate
   * attributes and classes added. If a date is given, the cell content will be set
   * based on the date.
   * @param {Date=} opt_date
   * @returns {HTMLElement}
   */
  CalendarMonthCtrl.prototype.buildDateCell = function(opt_date) {
    var calendarCtrl = this.calendarCtrl;

    // TODO(jelbourn): cloneNode is likely a faster way of doing this.
    var cell = document.createElement('td');
    cell.tabIndex = -1;
    cell.classList.add('md-calendar-date');
    cell.setAttribute('role', 'gridcell');

    if (opt_date) {
      cell.setAttribute('tabindex', '-1');
      cell.setAttribute('aria-label', this.dateLocale.longDateFormatter(opt_date));
      cell.id = calendarCtrl.getDateId(opt_date);

      // Use `data-timestamp` attribute because IE10 does not support the `dataset` property.
      cell.setAttribute('data-timestamp', opt_date.getTime());

      // TODO(jelourn): Doing these comparisons for class addition during generation might be slow.
      // It may be better to finish the construction and then query the node and add the class.
      if (this.dateUtil.isSameDay(opt_date, calendarCtrl.today)) {
        cell.classList.add(TODAY_CLASS);
      }

      if (this.dateUtil.isValidDate(calendarCtrl.selectedDate) &&
          this.dateUtil.isSameDay(opt_date, calendarCtrl.selectedDate)) {
        cell.classList.add(SELECTED_DATE_CLASS);
        cell.setAttribute('aria-selected', 'true');
      }

      var cellText = this.dateLocale.dates[opt_date.getDate()];

      // BJF: disable/color icons here
      if (this.dateUtil.isDateWithinRange(opt_date,
          this.calendarCtrl.minDate, this.calendarCtrl.maxDate)
          && (!this.calendarCtrl.validDate || this.calendarCtrl.validDate(opt_date))) {
        // Add a indicator for select, hover, and focus states.
        var selectionIndicator = document.createElement('span');
        cell.appendChild(selectionIndicator);
        selectionIndicator.classList.add('md-calendar-date-selection-indicator');
        selectionIndicator.textContent = cellText;

        // BJF: use these lines to add typed classes
        if (!this.dateUtil.isSameDay(opt_date, calendarCtrl.selectedDate)) {
          if (this.calendarCtrl.dateTypeIndex) {
            var details = this.calendarCtrl.dateTypeIndex(opt_date);
            selectionIndicator.style.background = details.bgColor;
            selectionIndicator.style.color = details.fgColor;
          }
        }

        cell.addEventListener('click', calendarCtrl.cellClickHandler);

        if (calendarCtrl.focusDate && this.dateUtil.isSameDay(opt_date, calendarCtrl.focusDate)) {
          this.focusAfterAppend = cell;
        }
      } else {
        cell.classList.add('md-calendar-date-disabled');
        cell.textContent = cellText;
      }
    }

    return cell;
  };

  /**
   * Builds a `tr` element for the calendar grid.
   * @param rowNumber The week number within the month.
   * @returns {HTMLElement}
   */
  CalendarMonthCtrl.prototype.buildDateRow = function(rowNumber) {
    var row = document.createElement('tr');
    row.setAttribute('role', 'row');

    // Because of an NVDA bug (with Firefox), the row needs an aria-label in order
    // to prevent the entire row being read aloud when the user moves between rows.
    // See http://community.nvda-project.org/ticket/4643.
    row.setAttribute('aria-label', this.dateLocale.weekNumberFormatter(rowNumber));

    return row;
  };

  /**
   * Builds the <tbody> content for the given date's month.
   * @param {Date=} opt_dateInMonth
   * @returns {DocumentFragment} A document fragment containing the <tr> elements.
   */
  CalendarMonthCtrl.prototype.buildCalendarForMonth = function(opt_dateInMonth) {
    var date = this.dateUtil.isValidDate(opt_dateInMonth) ? opt_dateInMonth : new Date();

    var firstDayOfMonth = this.dateUtil.getFirstDateOfMonth(date);
    var firstDayOfTheWeek = this.getLocaleDay_(firstDayOfMonth);
    var numberOfDaysInMonth = this.dateUtil.getNumberOfDaysInMonth(date);

    // Store rows for the month in a document fragment so that we can append them all at once.
    var monthBody = document.createDocumentFragment();

    var rowNumber = 1;
    var row = this.buildDateRow(rowNumber);
    monthBody.appendChild(row);

    // If this is the final month in the list of items, only the first week should render,
    // so we should return immediately after the first row is complete and has been
    // attached to the body.
    var isFinalMonth = this.offset === this.calendarCtrl.items.length - 1;

    // Add a label for the month. If the month starts on a Sun/Mon/Tues, the month label
    // goes on a row above the first of the month. Otherwise, the month label takes up the first
    // two cells of the first row.
    var blankCellOffset = 0;
    var monthLabelCell = document.createElement('td');
    monthLabelCell.classList.add('md-calendar-month-label');
    // If the entire month is after the max date, render the label as a disabled state.
    if (this.calendarCtrl.maxDate && firstDayOfMonth > this.calendarCtrl.maxDate) {
      monthLabelCell.classList.add('md-calendar-month-label-disabled');
    }
    monthLabelCell.textContent = this.dateLocale.monthHeaderFormatter(date);
    if (firstDayOfTheWeek <= 2) {
      monthLabelCell.setAttribute('colspan', '7');

      var monthLabelRow = this.buildDateRow();
      monthLabelRow.appendChild(monthLabelCell);
      monthBody.insertBefore(monthLabelRow, row);

      if (isFinalMonth) {
        return monthBody;
      }
    } else {
      blankCellOffset = 2;
      monthLabelCell.setAttribute('colspan', '2');
      row.appendChild(monthLabelCell);
    }

    // Add a blank cell for each day of the week that occurs before the first of the month.
    // For example, if the first day of the month is a Tuesday, add blank cells for Sun and Mon.
    // The blankCellOffset is needed in cases where the first N cells are used by the month label.
    for (var i = blankCellOffset; i < firstDayOfTheWeek; i++) {
      row.appendChild(this.buildDateCell());
    }

    // Add a cell for each day of the month, keeping track of the day of the week so that
    // we know when to start a new row.
    var dayOfWeek = firstDayOfTheWeek;
    var iterationDate = firstDayOfMonth;
    for (var d = 1; d <= numberOfDaysInMonth; d++) {
      // If we've reached the end of the week, start a new row.
      if (dayOfWeek === 7) {
        // We've finished the first row, so we're done if this is the final month.
        if (isFinalMonth) {
          return monthBody;
        }
        dayOfWeek = 0;
        rowNumber++;
        row = this.buildDateRow(rowNumber);
        monthBody.appendChild(row);
      }

      iterationDate.setDate(d);
      var cell = this.buildDateCell(iterationDate);
      row.appendChild(cell);

      dayOfWeek++;
    }

    // Ensure that the last row of the month has 7 cells.
    while (row.childNodes.length < 7) {
      row.appendChild(this.buildDateCell());
    }

    // Ensure that all months have 6 rows. This is necessary for now because the virtual-repeat
    // requires that all items have exactly the same height.
    while (monthBody.childNodes.length < 6) {
      var whitespaceRow = this.buildDateRow();
      for (var i = 0; i < 7; i++) {
        whitespaceRow.appendChild(this.buildDateCell());
      }
      monthBody.appendChild(whitespaceRow);
    }

    return monthBody;
  };

  /**
   * Gets the day-of-the-week index for a date for the current locale.
   * @private
   * @param {Date} date
   * @returns {number} The column index of the date in the calendar.
   */
  CalendarMonthCtrl.prototype.getLocaleDay_ = function(date) {
    return (date.getDay() + (7 - this.dateLocale.firstDayOfWeek)) % 7
  };
})();
