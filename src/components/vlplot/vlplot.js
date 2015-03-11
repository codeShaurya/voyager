'use strict';

angular.module('vleApp')
  .directive('vlPlot', function(vl, vg, $timeout, $q, Dataset, Config, consts) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'components/vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        'vgSpec':'=',
        'vlSpec': '=',
        'shorthand': '=',
        'maxHeight':'=',
        'maxWidth': '=',
        'alwaysScrollable': '=',
        'overflow': '=',
        'configSet': '@'
      },
      replace: true,
      link: function(scope, element) {
        scope.visId = (counter++);
        scope.hoverAction = null;
        scope.mouseover = function() {
          scope.hoverAction = $timeout(function(){
            scope.hoverFocus = true;
          }, 500);
        };

        scope.mouseout = function() {
          $timeout.cancel(scope.hoverAction);
          scope.hoverFocus = scope.unlocked = false;
        };

        function getVgSpec() {
          return consts.defaultConfigSet && scope.configSet && consts.defaultConfigSet !== scope.configSet ? null : scope.vgSpec;
        }

        function getCompiledSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};
          var encoding = vl.Encoding.fromSpec(scope.vlSpec, {
            cfg: Config[configSet]()
          });
          return vl.compile(encoding, Dataset.stats);
        }

        function render(spec) {
          var start = new Date().getTime();


          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = scope.shorthand || (scope.vlSpec ? vl.Encoding.shorthandFromSpec(scope.vlSpec) : '');

          scope.renderer = getRenderer(spec);

          vg.parse.spec(spec, function(chart) {
            var endParse = new Date().getTime();
            view = null;
            view = chart({el: element[0]});

            if (!consts.useUrl) {
              view.data({raw: Dataset.data});
            }

            scope.width =  view.width();
            scope.height = view.height();
            view.renderer(getRenderer(spec.width, scope.height));
            view.update();

            var endChart = new Date().getTime();
            console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);

            view.on('mouseover', function(event, item) {
              // TODO: Hanchuan please create tooltip from this
              console.log(item.datum.data);
            });
          });
        }

        var view;
        scope.$watch('vgSpec',function() {
          var spec = getVgSpec();
          if (!spec) {
            if (view) {
              view.off('mouseover');
            }
            return;
          }

          render(spec);
        }, true);

        scope.$watch('vlSpec', function() {
          var vgSpec = getVgSpec();
          if (vgSpec) { return; } //no need to update

          var spec = getCompiledSpec();
          render(spec);
        }, true);
      }
    };
  });