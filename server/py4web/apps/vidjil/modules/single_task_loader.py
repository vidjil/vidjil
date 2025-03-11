from celery.loaders.app import AppLoader

# See https://github.com/celery/celery/discussions/7106


class SingleTaskLoader(AppLoader):
    def on_worker_init(self):
        # called when the worker starts, before logging setup
        super().on_worker_init()

        """
        STEP 1:
        monkey patch kombu.transport.virtual.base.QoS.can_consume()
        to prefer to run a delegate function,
        instead of the builtin implementation.
        """

        import kombu.transport.virtual

        builtin_can_consume = kombu.transport.virtual.QoS.can_consume

        def can_consume(self):
            """
            monkey patch for kombu.transport.virtual.QoS.can_consume

            if self.delegate_can_consume exists, run it instead
            """
            if delegate := getattr(self, "delegate_can_consume", False):
                return delegate()
            else:
                return builtin_can_consume(self)

        kombu.transport.virtual.QoS.can_consume = can_consume

        """
        STEP 2:
        add a bootstep to the celery Consumer blueprint
        to supply the delegate function above.
        """

        from celery import bootsteps
        from celery.worker import state as worker_state

        class Set_QoS_Delegate(bootsteps.StartStopStep):
            requires = {"celery.worker.consumer.tasks:Tasks"}

            def start(self, c):
                def can_consume():
                    """
                    delegate for QoS.can_consume

                    only fetch a message from the queue if the worker has
                    no other messages
                    """
                    # note: reserved_requests includes active_requests
                    return (
                        len(worker_state.reserved_requests) < c.controller.concurrency
                    )

                # types...
                # c: celery.worker.consumer.consumer.Consumer
                # c.task_consumer: kombu.messaging.Consumer
                # c.task_consumer.channel: kombu.transport.virtual.Channel
                # c.task_consumer.channel.qos: kombu.transport.virtual.QoS
                c.task_consumer.channel.qos.delegate_can_consume = can_consume

        # add bootstep to Consumer blueprint
        self.app.steps["consumer"].add(Set_QoS_Delegate)
