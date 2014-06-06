document.addEventListener('DOMContentLoaded', function() {
  $('#vault-navbar a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  });
});
