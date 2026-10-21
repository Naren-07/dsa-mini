#pragma once

#ifndef NOMINMAX
#define NOMINMAX
#endif

#include "httplib.h"

namespace pathlab {

void register_routes(httplib::Server& svr);

} // namespace pathlab
