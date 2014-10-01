$(document).ready(function() {
    var controllers = new ControllerUrls(localStorage["webAppHost"]);

    $("#contact-us-form").validate({
        rules: {
            subject: "required",
            content: "required"
        },

        errorPlacement: function(error, element) {},

        highlight: function(element, errorClass, validClass)
        {
            $(element).closest(".form-group").removeClass("has-success").addClass("has-error");
        },
        unhighlight: function(element, errorClass, validClass)
        {
            $(element).closest(".form-group").removeClass("has-error").addClass("has-success");
        }
    });

    $("#contact-us-submit").click(function() {
        if ($("#contact-us-form").valid()) {
            var data = { "trouble_ticket": { "user_id": localStorage["userID"], "subject": $("#subject").val(), "content": $("#content").val() } };

            $.ajax({
                url: controllers.AppendCred(controllers.GetUrl("trouble_tickets") + ".json"),
                type: "POST",
                data: data,
                dataType: "text"
            }).done(function(){
                window.close();
            }).fail(function (jqXHR, textStatus, errorThrown){
                // log the error to the console
                console.error("The following error occurred: " + textStatus,
                              errorThrown);
            });
        }
    });
});
