$(document).ready(function () {
    var image = $('img');
    var selectedItems = []
    $('#selections').html( selectedItems.length>0 ?"<b>Selected body Parts: </b>"+ selectedItems : "<b>Please select a body part</b>" );

    var defaultDipTooltip = '<b><u>Spine</u></b>';

    image.mapster(
        {
            fillOpacity: 0.4,
            fillColor: "d42e16",
            strokeColor: "3320FF",
            strokeOpacity: 0.8,
            strokeWidth: 4,
            stroke: true,
            isSelectable: true,
            singleSelect: false,
            mapKey: 'name',
            listKey: 'key',
            onClick: function (e) {
                var newToolTip = defaultDipTooltip;
                if($.inArray(e.key,selectedItems) >= 0){
                    selectedItems.splice($.inArray(e.key, selectedItems),1);
                }else{
                    selectedItems.push(e.key);
                }
                // $('#selections').html( selectedItems.length);
                $('#selections').html( selectedItems.length>0 ?"<b>Selected body Parts: </b>"+ selectedItems.toString().replace(new RegExp('_', 'g')," ").replace(new RegExp(',', 'g'),", ") : "<b>Please select a body part</b>" );

            },
            showToolTip: true,
            toolTipClose: ["tooltip-click", "area-click"],
            areas: [
                {
                },
            ]

        });
});
