(function (OA) {
  'use strict';
  OA.perm = {
    can: function (user, action, resource, target) {
      if (!user || user.status === 'disabled') return false;
      if (user.role === 'admin') return true;
      if (resource === 'users') return (user.role === 'trainee' && (action === 'read' || action === 'update') && target && target.id === user.id) || (user.role === 'trainer' && action === 'read' && target && Array.isArray(user.traineeIds) && user.traineeIds.includes(target.id));
      return false;
    }
  };
})(window.OA = window.OA || {});
