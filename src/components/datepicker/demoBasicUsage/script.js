/**

SETUP:
- gulp server
- gulp watch-demo -c datepicker
- open http://localhost:8080/dist/demos/datepicker/demoBasicUsage/index.html
- start editing in material/src/components/datepicker folder

*/

angular.module('datepickerBasicUsage', ['ngMaterial'])
    .controller('AppCtrl', function($scope, $compile, $element) {

      var date = new Date();

      $scope.startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // reset time to 0:00
      $scope.minStartDate = new Date(date.getFullYear(), date.getMonth() - 2, date.getDate());
      $scope.maxStartDate = new Date(date.getFullYear(), date.getMonth() + 2, date.getDate());

      $scope.types = function() {
        return [
          { label: "Premier", fgColor: "black", bgColor: "red" },
          { label: "Pub", fgColor: "white", bgColor: "blue" }
        ];
      };

      var defaultDurations = [
        { label: "4 weeks" },
        { label: "8 weeks" }
      ];
      $scope.durations = defaultDurations.concat([]); // clone array

      $scope.$watch('startDate', function() {
        if ($scope.duration) {
          $scope.duration = null;
          $scope.endDate = null;
          $scope.durations = defaultDurations.concat([]); // clone array
        }
      });

      $scope.index = function(date) {
        var types = $scope.types();
        var i = Math.round((types.length - 1) * Math.random());
        return types[i];
      };

      $scope.isValidStartDate = function(date) {
        // random false or true
        return (Math.random() < 0.5);
      };

      $scope.newEndDate = function() {
        var date = $scope.endDate;
        var diff = $scope.endDate - $scope.startDate;
        var days = Math.floor(diff / 1000 / 60 / 60 / 24);
        var label;
        if (days === 0) label = "Same day";
        else if (days === 7) label = "1 week";
        else if (days % 7 === 0) label = (days / 7) + " weeks";
        else label = days + " days";
        var found = false;
        for (var i = 0; i < $scope.durations.length; i++) {
          if ($scope.durations[i].label === label) found = true;
        }
        if (!found) $scope.durations.push({ label: label });
        $scope.duration = label;
      };

      $scope.showEndCalendar = function() {
        // remove any old calendars first
        var oldCal = document.querySelector('.md-date-range-duration-calendar');
        if (oldCal) document.body.removeChild(oldCal);

        var date = $scope.startDate;
        $scope.endDate = date;
        $scope.minEndDate = date;
        $scope.maxEndDate = new Date(date.getFullYear(), date.getMonth() + 2, date.getDate());
        var el = $compile('<md-calendar class="md-date-range-duration-calendar"' +
          '  ng-style="duration !== \'Custom\' && { \'display\': \'none\' }"' +
          '  ng-model="endDate"' +
          '  md-min-date="minEndDate"' +
          '  md-max-date="maxEndDate"' +
          '  date-types="types"' +
          '  date-type-index="index"' +
          '  valid-date="isValidStartDate"' +
          '  ng-change="newEndDate()">' +
          '</md-calendar>')($scope);
        // position the calendar over the duration select input
        var calendarPane = el[0];
        calendarPane.style.position = "absolute";
        calendarPane.style.background = "white";
        calendarPane.style.border = "1px solid rgb(224,224,224)";
        calendarPane.classList.add('md-whiteframe-z1');

        // NOTE: all the below to end of function is copied and slightly modified from datePicker.js's attachCalendarPane
        
        var CALENDAR_PANE_HEIGHT = 430;// 368;
        var CALENDAR_PANE_WIDTH = 360;

        var elementRect = document.querySelector('[ng-model="duration"]').getBoundingClientRect();
        var bodyRect = document.body.getBoundingClientRect();

        // Check to see if the calendar pane would go off the screen. If so, adjust position
        // accordingly to keep it within the viewport.
        var paneTop = elementRect.top - bodyRect.top;
        var paneLeft = elementRect.left - bodyRect.left;
    
        // If the right edge of the pane would be off the screen and shifting it left by the
        // difference would not go past the left edge of the screen.
        if (paneLeft + CALENDAR_PANE_WIDTH > bodyRect.right &&
            bodyRect.right - CALENDAR_PANE_WIDTH > 0) {
          paneLeft = bodyRect.right - CALENDAR_PANE_WIDTH;
          calendarPane.classList.add('md-datepicker-pos-adjusted');
        }
    
        // If the bottom edge of the pane would be off the screen and shifting it up by the
        // difference would not go past the top edge of the screen.
        if (paneTop + CALENDAR_PANE_HEIGHT > bodyRect.bottom &&
            bodyRect.bottom - CALENDAR_PANE_HEIGHT > 0) {
          paneTop = bodyRect.bottom - CALENDAR_PANE_HEIGHT;
          calendarPane.classList.add('md-datepicker-pos-adjusted');
        }
    
        calendarPane.style.left = paneLeft + 'px';
        calendarPane.style.top = paneTop + 'px';

        document.body.appendChild(calendarPane);
      };

    });
